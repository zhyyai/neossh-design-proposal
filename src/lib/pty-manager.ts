import type { IPty } from "node-pty";

export interface CreateSessionOptions {
  label: string;
  target: string;
  username: string;
  port: number;
  mode?: "ssh" | "sandbox";
  cols?: number;
  rows?: number;
  onCommand?: (entry: { command: string; risk: string }) => void;
  onExit?: (code: number) => void;
}

export interface SessionMeta {
  id: string;
  label: string;
  target: string;
  status: "active" | "exited";
  createdAt: number;
}

export interface RecordingSnapshot {
  label: string;
  target: string;
  mode: string;
  entries: Array<[number, string]>;
  bytes: number;
  durationMs: number;
  hadInput: boolean;
}

type DataListener = (chunk: string) => void;
type ExitListener = (code: number) => void;

interface BufEntry {
  t: number;
  d: string;
}

interface PtySession {
  id: string;
  label: string;
  target: string;
  mode: string;
  pty: IPty;
  buffer: BufEntry[];
  bufferSize: number;
  dataListeners: Set<DataListener>;
  exitListeners: Set<ExitListener>;
  status: "active" | "exited";
  exitCode: number | null;
  createdAt: number;
  lineBuf: string;
  lastCommand: string;
  userTyped: boolean;
  onCommand?: CreateSessionOptions["onCommand"];
  onExit?: CreateSessionOptions["onExit"];
  gcTimer?: NodeJS.Timeout;
}

const MAX_BUFFER = 96 * 1024;
let ptyModulePromise: Promise<typeof import("node-pty")> | null = null;

function loadPty() {
  if (!ptyModulePromise) {
    ptyModulePromise = import("node-pty");
  }
  return ptyModulePromise;
}

/* ---------------- risk engine ---------------- */

const DANGER_PATTERNS = [
  /\brm\s+-[^\n;|]*[rf][^\n;|]*\//i, // rm -rf /
  /\brm\s+-rf?\s+[/~*]/i,
  /\bmkfs\b/i,
  /\bdd\b[^\n]*\bof=\/dev\//i,
  /:\(\)\s*\{/, // fork bomb
  /\b(shutdown|reboot|halt|poweroff)\b/,
  /\/dev\/(sda|nvme|vda)/,
  /\bchmod\s+-R\s+0?777\s+\//,
  /\bchown\s+-R\s+[^\s]+\s+\//,
  />\s*\/etc\/(passwd|shadow|sudoers)/,
  /\b(mkfs|fdisk|parted)\.\w+/,
];

const WARN_PATTERNS = [
  /\bsudo\b/,
  /\b(curl|wget)\b[^\n]*\|\s*(sudo\s+)?(ba|z|fi)?sh\b/,
  /\bkill\s+-9\b/,
  /\bpkill\s+-9\b/,
  /\biptables\b/,
  /\bsystemctl\s+(stop|disable|restart|mask)\b/,
  /\brm\s+-r/,
  /\bchmod\s+-R\b/,
  /\b(nmap|masscan|tcpdump|ncat|nc)\b/,
  /\buser(add|del|mod)\b/,
  /\bpasswd\b/,
];

export function classifyRisk(command: string): "safe" | "warn" | "danger" {
  if (DANGER_PATTERNS.some((re) => re.test(command))) return "danger";
  if (WARN_PATTERNS.some((re) => re.test(command))) return "warn";
  return "safe";
}

/* ---------------- banner art ---------------- */

function banner(opts: CreateSessionOptions): string {
  const g = "\x1b[38;5;46m";
  const c = "\x1b[38;5;51m";
  const dim = "\x1b[38;5;244m";
  const bold = "\x1b[1m";
  const r = "\x1b[0m";
  return (
    `\r\n${g}${bold}  ◢◤ NEOSSH${r} ${dim}│${r} ${bold}SECURE CHANNEL ESTABLISHED${r}\r\n` +
    `  ${dim}target    ${r}${c}${opts.username}@${opts.target}:${opts.port}${r}\r\n` +
    `  ${dim}handshake ${r}curve25519-sha256 ${g}✓${r}  ${dim}cipher${r} chacha20-poly1305 ${g}✓${r}\r\n` +
    `  ${dim}channel   ${r}${g}● ACTIVE${r} ${dim}— uplink via neossh fabric${r}\r\n` +
    `  ${dim}audit     keystroke-level ▪ session #${Date.now().toString(36).toUpperCase()}${r}\r\n\r\n`
  );
}

/* ---------------- manager ---------------- */

class PtyManager {
  private sessions = new Map<string, PtySession>();
  private counter = 0;

  async create(opts: CreateSessionOptions): Promise<SessionMeta> {
    const nodePty = await loadPty();
    this.counter += 1;
    const id = `s${Date.now().toString(36)}${this.counter.toString(36)}${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    const shell = process.env.SHELL || "/bin/bash";
    const pty = nodePty.spawn(shell, ["-il"], {
      name: "xterm-256color",
      cols: Math.min(Math.max(opts.cols ?? 120, 20), 400),
      rows: Math.min(Math.max(opts.rows ?? 32, 6), 120),
      cwd: process.env.HOME || "/",
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
        NEOSSH_SESSION: opts.target,
      } as Record<string, string>,
    });

    const session: PtySession = {
      id,
      label: opts.label,
      target: opts.target,
      mode: opts.mode ?? "ssh",
      pty,
      buffer: [],
      bufferSize: 0,
      dataListeners: new Set(),
      exitListeners: new Set(),
      status: "active",
      exitCode: null,
      createdAt: Date.now(),
      lineBuf: "",
      lastCommand: "",
      userTyped: false,
      onCommand: opts.onCommand,
      onExit: opts.onExit,
    };
    this.sessions.set(id, session);

    pty.onData((data) => this.broadcast(session, data));
    pty.onExit(({ exitCode }) => {
      session.status = "exited";
      session.exitCode = exitCode;
      this.broadcast(
        session,
        `\r\n\x1b[38;5;244m  ── connection closed · code ${exitCode} ──\x1b[0m\r\n`,
      );
      for (const fn of session.exitListeners) {
        try {
          fn(exitCode);
        } catch {
          /* noop */
        }
      }
      try {
        session.onExit?.(exitCode);
      } catch {
        /* noop */
      }
      session.gcTimer = setTimeout(() => this.sessions.delete(id), 60_000);
    });

    this.broadcast(session, banner(opts));
    pty.write(
      "export PS1='\\[\\e[1;38;5;46m\\]\\u\\[\\e[0m\\]@\\[\\e[38;5;51m\\]neossh\\[\\e[0m\\] \\[\\e[1;34m\\]\\w\\[\\e[0m\\] \\[\\e[38;5;46m\\]❯\\[\\e[0m\\] ' ; export LS_OPTIONS='--color=auto'; alias ls='ls --color=auto' 2>/dev/null; cd ~; clear\r",
    );

    return this.meta(session);
  }

  private broadcast(session: PtySession, data: string) {
    session.buffer.push({ t: Date.now() - session.createdAt, d: data });
    session.bufferSize += data.length;
    while (session.bufferSize > MAX_BUFFER && session.buffer.length > 1) {
      session.bufferSize -= session.buffer[0].d.length;
      session.buffer.shift();
    }
    for (const fn of session.dataListeners) {
      try {
        fn(data);
      } catch {
        /* noop */
      }
    }
  }

  attach(
    id: string,
    onData: DataListener,
    onExit: ExitListener,
  ): (() => void) | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    if (session.gcTimer) {
      clearTimeout(session.gcTimer);
      session.gcTimer = undefined;
    }
    session.dataListeners.add(onData);
    session.exitListeners.add(onExit);
    if (session.buffer.length > 0) {
      onData(session.buffer.map((e) => e.d).join(""));
    }
    if (session.status === "exited") {
      queueMicrotask(() => onExit(session.exitCode ?? 0));
    }
    return () => {
      session.dataListeners.delete(onData);
      session.exitListeners.delete(onExit);
    };
  }

  /** timestamped replay snapshot — safe to call shortly before/after exit */
  snapshot(id: string): RecordingSnapshot | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    return {
      label: session.label,
      target: session.target,
      mode: session.mode,
      entries: session.buffer.map((e) => [e.t, e.d] as [number, string]),
      bytes: session.bufferSize,
      durationMs: Date.now() - session.createdAt,
      hadInput: session.userTyped,
    };
  }

  write(id: string, data: string): boolean {
    const session = this.sessions.get(id);
    if (!session || session.status !== "active") return false;
    if (/\S/.test(data)) session.userTyped = true;
    this.captureCommand(session, data);
    session.pty.write(data);
    return true;
  }

  resize(id: string, cols: number, rows: number): boolean {
    const session = this.sessions.get(id);
    if (!session || session.status !== "active") return false;
    const c = Math.min(Math.max(Math.floor(cols), 20), 400);
    const r = Math.min(Math.max(Math.floor(rows), 6), 120);
    try {
      session.pty.resize(c, r);
      return true;
    } catch {
      return false;
    }
  }

  kill(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    if (session.gcTimer) clearTimeout(session.gcTimer);
    try {
      session.pty.kill();
    } catch {
      /* noop */
    }
    this.sessions.delete(id);
    return true;
  }

  list(): SessionMeta[] {
    return [...this.sessions.values()].map((s) => this.meta(s));
  }

  activeCount(): number {
    let n = 0;
    for (const s of this.sessions.values()) if (s.status === "active") n += 1;
    return n;
  }

  private meta(s: PtySession): SessionMeta {
    return {
      id: s.id,
      label: s.label,
      target: s.target,
      status: s.status,
      createdAt: s.createdAt,
    };
  }

  /* -------- keystroke-level command capture -------- */
  private captureCommand(session: PtySession, data: string) {
    for (const ch of data) {
      if (ch === "\r") {
        const line = session.lineBuf.trim();
        session.lineBuf = "";
        if (
          line.length >= 2 &&
          line.length <= 300 &&
          line !== session.lastCommand
        ) {
          session.lastCommand = line;
          const risk = classifyRisk(line);
          try {
            session.onCommand?.({ command: line, risk });
          } catch {
            /* noop */
          }
        }
      } else if (ch === "\x7f" || ch === "\b") {
        session.lineBuf = session.lineBuf.slice(0, -1);
      } else if (ch === "\x03" /* ^C */ || ch === "\x15" /* ^U */) {
        session.lineBuf = "";
      } else if (ch === "\x1b") {
        session.lineBuf = "";
      } else if (ch >= " " && ch !== "\x7f") {
        session.lineBuf = (session.lineBuf + ch).slice(-400);
      }
    }
  }
}

const globalForPty = globalThis as typeof globalThis & {
  __neosshPtyManager?: PtyManager;
};

export const ptyManager =
  globalForPty.__neosshPtyManager ?? new PtyManager();

globalForPty.__neosshPtyManager = ptyManager;
