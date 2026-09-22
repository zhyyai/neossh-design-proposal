"use client";

import { useEffect, useRef } from "react";
import "@xterm/xterm/css/xterm.css";
import { TERMINAL_THEMES, type ThemeName } from "./terminal-themes";
import type { Terminal } from "@xterm/xterm";
import type { FitAddon } from "@xterm/addon-fit";

export interface SessionConfig {
  label: string;
  target: string;
  username: string;
  port: number;
  mode: "ssh" | "sandbox";
  runCmd?: string;
}

interface Props {
  viewId: string;
  config: SessionConfig;
  themeName: ThemeName;
  fontSize: number;
  fontStack: string;
  active: boolean;
  onSessionReady: (viewId: string, sessionId: string) => void;
  onExit: (viewId: string, code: number) => void;
  onUserInput: (viewId: string, data: string) => void;
  onGeometry: (viewId: string, cols: number, rows: number) => void;
}

export function sendInput(sessionId: string, data: string) {
  fetch("/api/terminal/input", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: sessionId, data }),
    keepalive: true,
  }).catch(() => undefined);
}

export function killSession(sessionId: string) {
  fetch(`/api/terminal?id=${encodeURIComponent(sessionId)}`, {
    method: "DELETE",
    keepalive: true,
  }).catch(() => undefined);
}

export default function XTermView({
  viewId,
  config,
  themeName,
  fontSize,
  fontStack,
  active,
  onSessionReady,
  onExit,
  onUserInput,
  onGeometry,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onSessionReady, onExit, onUserInput, onGeometry });
  callbacksRef.current = { onSessionReady, onExit, onUserInput, onGeometry };

  /* main lifecycle — once per mount */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let disposed = false;
    let es: EventSource | null = null;
    let ro: ResizeObserver | null = null;
    let runTimer: ReturnType<typeof setTimeout> | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let lastCols = 0;
    let lastRows = 0;

    const boot = async () => {
      // 1. create the PTY on the server (dimensions refined after fit)
      const createRes = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: config.label,
          target: config.target,
          username: config.username,
          port: config.port,
          mode: config.mode,
          cols: 120,
          rows: 32,
        }),
      });
      const created = await createRes.json();
      if (disposed) {
        if (created.session?.id) killSession(created.session.id);
        return;
      }
      const sessionId: string = created.session.id;
      sessionIdRef.current = sessionId;
      callbacksRef.current.onSessionReady(viewId, sessionId);

      // 2. build the terminal
      const [xterm, fit, links, unicode, webgl] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
        import("@xterm/addon-web-links"),
        import("@xterm/addon-unicode11"),
        import("@xterm/addon-webgl").catch(() => null),
      ]);
      if (disposed || !containerRef.current) return;

      const initialTheme =
        TERMINAL_THEMES[themeName]?.theme ?? TERMINAL_THEMES.matrix.theme;
      const term = new xterm.Terminal({
        theme: initialTheme,
        fontFamily: fontStack,
        fontSize,
        lineHeight: 1.18,
        letterSpacing: 0.2,
        cursorBlink: true,
        cursorStyle: "block",
        scrollback: 6000,
        allowProposedApi: true,
        macOptionIsMeta: true,
        drawBoldTextInBrightColors: true,
      });
      termRef.current = term;

      const fitAddon = new fit.FitAddon();
      fitRef.current = fitAddon;
      term.loadAddon(fitAddon);
      term.loadAddon(new links.WebLinksAddon());
      term.loadAddon(new unicode.Unicode11Addon());
      term.unicode.activeVersion = "11";

      term.open(containerRef.current);
      if (webgl) {
        try {
          const gl = new webgl.WebglAddon();
          gl.onContextLoss(() => gl.dispose());
          term.loadAddon(gl);
        } catch {
          /* canvas fallback is automatic */
        }
      }

      const doFit = () => {
        if (!fitRef.current || !termRef.current) return;
        try {
          fitRef.current.fit();
          const { cols, rows } = termRef.current;
          if ((cols !== lastCols || rows !== lastRows) && sessionIdRef.current) {
            lastCols = cols;
            lastRows = rows;
            fetch("/api/terminal/resize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: sessionIdRef.current, cols, rows }),
            }).catch(() => undefined);
            callbacksRef.current.onGeometry(viewId, cols, rows);
          }
        } catch {
          /* hidden view */
        }
      };
      doFit();
      requestAnimationFrame(doFit);

      ro = new ResizeObserver(() => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(doFit, 90);
      });
      ro.observe(containerRef.current);

      // 3. wire the output stream (SSE, base64 chunks)
      const decoder = new TextDecoder();
      es = new EventSource(`/api/terminal/stream?id=${encodeURIComponent(sessionId)}`);
      es.onmessage = (ev) => {
        try {
          const bin = atob(ev.data);
          const bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          term.write(decoder.decode(bytes, { stream: true }));
        } catch {
          /* malformed chunk */
        }
      };
      es.addEventListener("exit", (ev) => {
        callbacksRef.current.onExit(viewId, Number((ev as MessageEvent).data) || 0);
        es?.close();
      });

      // 4. user input travels through the workspace (broadcast-aware)
      term.onData((data) => callbacksRef.current.onUserInput(viewId, data));

      // 5. optional payload command (snippet fire / palette run)
      if (config.runCmd) {
        runTimer = setTimeout(() => {
          if (sessionIdRef.current) {
            sendInput(sessionIdRef.current, `${config.runCmd}\r`);
          }
        }, 900);
      }

      if (active) term.focus();
    };

    boot().catch(() => undefined);

    return () => {
      disposed = true;
      if (runTimer) clearTimeout(runTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      es?.close();
      ro?.disconnect();
      termRef.current?.dispose();
      termRef.current = null;
      if (sessionIdRef.current) {
        killSession(sessionIdRef.current);
        sessionIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewId]);

  /* live theme */
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    const t = TERMINAL_THEMES[themeName];
    if (t) term.options.theme = t.theme;
  }, [themeName]);

  /* live font size */
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.fontSize = fontSize;
    try {
      fitRef.current?.fit();
    } catch {
      /* noop */
    }
  }, [fontSize]);

  /* live font family */
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    term.options.fontFamily = fontStack;
    try {
      fitRef.current?.fit();
    } catch {
      /* noop */
    }
  }, [fontStack]);

  /* focus when shown */
  useEffect(() => {
    if (active && termRef.current) {
      try {
        fitRef.current?.fit();
      } catch {
        /* noop */
      }
      termRef.current.focus();
    }
  }, [active]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ display: active ? "block" : "none" }}
      onClick={() => termRef.current?.focus()}
    />
  );
}
