"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type LineCls = "cmd" | "out" | "ok" | "warn" | "danger" | "dim" | "cyan";
interface Line {
  text: string;
  cls: LineCls;
}

type Step =
  | { t: "cmd"; text: string }
  | { t: "out"; text: string; cls?: LineCls; ms?: number }
  | { t: "prompt"; text: string }
  | { t: "pause"; ms: number }
  | { t: "clear" };

const SCRIPT: Step[] = [
  { t: "pause", ms: 900 },
  { t: "cmd", text: "neossh connect deploy@core-prod-01" },
  { t: "out", text: "  resolving core-prod-01 → 10.0.4.21:22", cls: "dim", ms: 340 },
  { t: "out", text: "  handshake   curve25519-sha256  ✓", cls: "ok", ms: 260 },
  { t: "out", text: "  cipher      chacha20-poly1305 ✓", cls: "ok", ms: 220 },
  { t: "out", text: "  channel     ● ACTIVE — keystroke audit on", cls: "cyan", ms: 420 },
  { t: "prompt", text: "deploy@core-prod-01 ~ ❯" },
  { t: "pause", ms: 500 },
  { t: "cmd", text: "neossh broadcast --group prod 'systemctl reload nginx'" },
  { t: "out", text: "  ▸ fan-out: 3 targets · parallel mode", cls: "dim", ms: 300 },
  { t: "out", text: "  [core-prod-01 ] reloaded in 0.42s", cls: "ok", ms: 380 },
  { t: "out", text: "  [core-prod-02 ] reloaded in 0.61s", cls: "ok", ms: 380 },
  { t: "out", text: "  [edge-tokyo-02] reloaded in 1.13s", cls: "ok", ms: 500 },
  { t: "pause", ms: 400 },
  { t: "cmd", text: "tail -n 2 /var/log/nginx/error.log" },
  { t: "out", text: "  09:41:02 [warn] upstream timed out (110) api.internal", cls: "out", ms: 300 },
  { t: "out", text: "  09:41:09 [crit] SSL_do_handshake() failed peer=203.0.113.9", cls: "out", ms: 520 },
  { t: "pause", ms: 300 },
  { t: "cmd", text: "sudo rm -rf /var/log/*" },
  { t: "out", text: "  ⛔ RISK ENGINE — destructive pattern matched", cls: "danger", ms: 200 },
  { t: "out", text: "  command quarantined · supervisor approval required", cls: "warn", ms: 600 },
  { t: "out", text: "  audit trail → session #9F3K2 sealed", cls: "dim", ms: 400 },
  { t: "pause", ms: 2600 },
  { t: "clear" },
];

const CLS_MAP: Record<LineCls, string> = {
  cmd: "text-neon-hi",
  out: "text-zinc-400",
  ok: "text-neon",
  warn: "text-amberx",
  danger: "text-dangerx",
  dim: "text-zinc-500",
  cyan: "text-cyanx",
};

const MAX_LINES = 13;

export default function LiveTerminal() {
  const [lines, setLines] = useState<Line[]>([]);
  const [typing, setTyping] = useState("");
  const [prompt, setPrompt] = useState("λ fabric");
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) =>
      new Promise<void>((res) => setTimeout(res, ms));

    const run = async () => {
      await sleep(400);
      while (!cancelled) {
        for (const step of SCRIPT) {
          if (cancelled) return;
          switch (step.t) {
            case "pause":
              await sleep(step.ms);
              break;
            case "prompt":
              setPrompt(step.text);
              break;
            case "clear":
              setLines([]);
              break;
            case "out":
              await sleep(step.ms ?? 260);
              if (cancelled) return;
              setLines((prev) =>
                [...prev, { text: step.text, cls: step.cls ?? "out" }].slice(
                  -MAX_LINES,
                ),
              );
              break;
            case "cmd": {
              for (let i = 1; i <= step.text.length; i++) {
                if (cancelled) return;
                setTyping(step.text.slice(0, i));
                await sleep(24 + Math.random() * 46);
              }
              await sleep(240);
              if (cancelled) return;
              setTyping("");
              setLines((prev) =>
                [...prev, { text: step.text, cls: "cmd" as LineCls }].slice(
                  -MAX_LINES,
                ),
              );
              break;
            }
          }
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [lines, typing]);

  return (
    <div className="scanlines crt-vignette relative overflow-hidden rounded-lg border border-line bg-void/90 box-glow backdrop-blur">
      {/* title bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-line bg-panel/90 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 bg-neon/80" />
          <span className="h-2.5 w-2.5 bg-cyanx/70" />
          <span className="h-2.5 w-2.5 bg-dangerx/70" />
        </div>
        <span className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
          ops@fabric · pts/0 · 138×34
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-neon/80">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-neon animate-pulse-dot" />
          TLS 1.3
        </span>
      </div>
      {/* body */}
      <div
        ref={bodyRef}
        className={cn(
          "relative z-10 h-[340px] space-y-1 overflow-hidden p-4 text-[12.5px] leading-relaxed sm:text-[13px]",
          "animate-boot",
        )}
      >
        {lines.map((l, i) =>
          l.cls === "cmd" ? (
            <div key={i} className="vt-line">
              <span className="text-cyanx">{prompt} </span>
              <span className={CLS_MAP.cmd}>{l.text}</span>
            </div>
          ) : (
            <div key={i} className={cn("vt-line", CLS_MAP[l.cls])}>
              {l.text}
            </div>
          ),
        )}
        <div className="vt-line">
          <span className="text-cyanx">{prompt} </span>
          <span className="text-neon-hi">{typing}</span>
          <span className="ml-0.5 inline-block h-[14px] w-[8px] translate-y-[2px] bg-neon animate-blink" />
        </div>
      </div>
      {/* sweep */}
      <div className="pointer-events-none absolute inset-x-0 z-20 h-16 animate-scan-y bg-gradient-to-b from-transparent via-neon/[0.05] to-transparent" />
    </div>
  );
}
