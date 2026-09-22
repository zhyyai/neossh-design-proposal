"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "@xterm/xterm/css/xterm.css";
import type { Terminal } from "@xterm/xterm";
import {
  MonitorPlay,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  FastForward,
  Clock3,
} from "lucide-react";
import { TERMINAL_THEMES } from "@/components/terminal/terminal-themes";
import { cn, fmtBytes, timeAgo } from "@/lib/utils";
import { usePrefs } from "@/lib/prefs";

interface RecMeta {
  id: string;
  sessionLabel: string;
  target: string;
  mode: string;
  bytes: number;
  durationMs: number;
  createdAt: string;
}

type RawEntry = [number, string];

const SPEEDS = [0.5, 1, 2, 4, 8];

function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

export default function ReplayClient({
  initialRecordings,
}: {
  initialRecordings: RecMeta[];
}) {
  const { t } = usePrefs();
  const [list, setList] = useState(initialRecordings);
  const [sel, setSel] = useState<RecMeta | null>(null);
  const [entries, setEntries] = useState<RawEntry[] | null>(null);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [posUi, setPosUi] = useState(0);
  const [loading, setLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const entriesRef = useRef<RawEntry[] | null>(null);
  const idxRef = useRef(0);
  const posRef = useRef(0);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  playingRef.current = playing;
  speedRef.current = speed;

  /* init terminal when a take loads */
  useEffect(() => {
    if (!entries) return;
    let disposed = false;
    let ro: ResizeObserver | null = null;
    let fit: { fit: () => void } | null = null;

    (async () => {
      const [x, f] = await Promise.all([
        import("@xterm/xterm"),
        import("@xterm/addon-fit"),
      ]);
      if (disposed || !containerRef.current) return;
      const term = new x.Terminal({
        theme: TERMINAL_THEMES.matrix.theme,
        fontFamily: '"JetBrains Mono", ui-monospace, Menlo, monospace',
        fontSize: 13,
        lineHeight: 1.18,
        cursorBlink: false,
        scrollback: 8000,
        disableStdin: true,
        allowProposedApi: true,
      });
      const fitAddon = new f.FitAddon();
      term.loadAddon(fitAddon);
      fit = fitAddon;
      term.open(containerRef.current);
      try {
        fitAddon.fit();
      } catch {
        /* noop */
      }
      ro = new ResizeObserver(() => {
        try {
          fit?.fit();
        } catch {
          /* noop */
        }
      });
      ro.observe(containerRef.current);
      termRef.current = term;
      term.writeln("\x1b[38;5;244m  ── take sealed · press play ──\x1b[0m");
    })();

    return () => {
      disposed = true;
      ro?.disconnect();
      termRef.current?.dispose();
      termRef.current = null;
    };
  }, [entries]);

  /* playback clock */
  useEffect(() => {
    if (!entries) return;
    const t = setInterval(() => {
      const listEntries = entriesRef.current;
      if (!listEntries || !playingRef.current) return;
      posRef.current += 50 * speedRef.current;
      const term = termRef.current;
      while (
        term &&
        idxRef.current < listEntries.length &&
        listEntries[idxRef.current][0] <= posRef.current
      ) {
        term.write(listEntries[idxRef.current][1]);
        idxRef.current += 1;
      }
      const total = listEntries.length
        ? listEntries[listEntries.length - 1][0]
        : 0;
      if (posRef.current >= total) {
        posRef.current = total;
        setPlaying(false);
      }
      setPosUi(posRef.current);
    }, 50);
    return () => clearInterval(t);
  }, [entries]);

  const seek = useCallback((ms: number) => {
    const listEntries = entriesRef.current;
    const term = termRef.current;
    if (!listEntries || !term) return;
    posRef.current = ms;
    term.reset();
    let i = 0;
    const parts: string[] = [];
    while (i < listEntries.length && listEntries[i][0] <= ms) {
      parts.push(listEntries[i][1]);
      i += 1;
    }
    if (parts.length > 0) term.write(parts.join(""));
    idxRef.current = i;
    setPosUi(ms);
  }, []);

  const load = async (meta: RecMeta) => {
    setLoading(true);
    setSel(meta);
    setPlaying(false);
    setPosUi(0);
    try {
      const res = await fetch(`/api/recordings/${meta.id}`, { cache: "no-store" });
      const json = await res.json();
      const parsed = JSON.parse(json.recording.data) as RawEntry[];
      entriesRef.current = parsed;
      idxRef.current = 0;
      posRef.current = 0;
      setDuration(parsed.length ? parsed[parsed.length - 1][0] : 0);
      setEntries(parsed);
    } catch {
      setEntries(null);
    } finally {
      setLoading(false);
    }
  };

  const playPause = () => {
    if (!entries) return;
    if (!playing && posRef.current >= duration - 1) {
      seek(0);
    }
    setPlaying((v) => !v);
  };

  const restart = () => {
    seek(0);
    setPlaying(true);
  };

  const cycleSpeed = () => {
    setSpeed((v) => SPEEDS[(SPEEDS.indexOf(v) + 1) % SPEEDS.length]);
  };

  const remove = async (meta: RecMeta) => {
    await fetch(`/api/recordings/${meta.id}`, { method: "DELETE" }).catch(
      () => undefined,
    );
    setList((prev) => prev.filter((r) => r.id !== meta.id));
    if (sel?.id === meta.id) {
      setSel(null);
      setEntries(null);
      entriesRef.current = null;
      setPlaying(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 p-6 lg:flex-row">
      {/* takes list */}
      <aside className="w-full shrink-0 border border-line bg-panel lg:w-80">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
          <MonitorPlay className="h-3.5 w-3.5 text-neon" /> {t("rep.takes")} · {list.length}
        </div>
        <div className="max-h-[62vh] divide-y divide-line/50 overflow-y-auto">
          {list.map((r) => (
            <div
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => load(r)}
              onKeyDown={(e) => e.key === "Enter" && load(r)}
              className={cn(
                "group flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left transition-colors",
                sel?.id === r.id ? "bg-neon/10" : "hover:bg-lift",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    "truncate text-[12px]",
                    sel?.id === r.id ? "text-neon-hi" : "text-zinc-200",
                  )}
                >
                  {r.sessionLabel}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(r);
                  }}
                  className="text-zinc-600 opacity-0 transition-all group-hover:opacity-100 hover:text-dangerx"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-[9.5px] text-zinc-600">
                <span className="truncate">{r.target}</span>
                <span className="ml-auto flex items-center gap-1">
                  <Clock3 className="h-2.5 w-2.5" />
                  {fmtClock(r.durationMs)}
                </span>
                <span>{fmtBytes(r.bytes)}</span>
                <span>{timeAgo(r.createdAt)}</span>
              </div>
            </div>
          ))}
          {list.length === 0 && (
            <div className="px-4 py-12 text-center text-[10px] leading-relaxed tracking-[0.2em] text-zinc-600 uppercase">
              {t("rep.none")}
              <br />
              <span className="normal-case tracking-normal">
                every terminal session leaves a take when the channel closes
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* player */}
      <section className="min-w-0 flex-1">
        {!entries ? (
          <div className="flex h-[520px] flex-col items-center justify-center gap-4 border border-line bg-panel text-zinc-600">
            <MonitorPlay className="h-8 w-8" />
            <span className="text-[11px] tracking-[0.3em] uppercase">
              {loading ? "decrypting take…" : t("rep.select")}
            </span>
          </div>
        ) : (
          <div className="border border-line bg-panel">
            {/* meta bar */}
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-neon-hi">{sel?.sessionLabel}</span>
                <span className="text-zinc-600">{sel?.target}</span>
                <span className="border border-line px-1.5 py-0.5 text-[9px] tracking-widest text-zinc-500 uppercase">
                  {sel?.mode}
                </span>
              </div>
              <span className="text-[9px] tracking-[0.25em] text-zinc-600 uppercase">
                replay renderer · matrix
              </span>
            </div>
            {/* screen */}
            <div className="scanlines crt-vignette relative bg-[#020403]">
              <div ref={containerRef} className="h-[440px] w-full" />
            </div>
            {/* controls */}
            <div className="flex items-center gap-3 border-t border-line px-4 py-3">
              <button
                onClick={playPause}
                className="flex h-9 w-9 items-center justify-center border border-neon/50 bg-neon/10 text-neon transition-all hover:bg-neon hover:text-black"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <button
                onClick={restart}
                className="flex h-9 w-9 items-center justify-center border border-line text-zinc-500 transition-colors hover:text-neon"
                title="restart"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={cycleSpeed}
                className="flex h-9 items-center gap-1.5 border border-line px-3 text-[11px] text-zinc-400 transition-colors hover:text-neon"
                title="playback speed"
              >
                <FastForward className="h-3.5 w-3.5" />
                <span className="w-9 text-left tabular-nums">{speed}×</span>
              </button>
              <input
                type="range"
                min={0}
                max={Math.max(duration, 1)}
                step={100}
                value={Math.min(posUi, duration)}
                onChange={(e) => seek(Number(e.target.value))}
                className="h-1 flex-1 cursor-pointer appearance-none bg-edge accent-[#00ff9c]"
              />
              <span className="w-28 text-right text-[11px] text-zinc-400 tabular-nums">
                {fmtClock(posUi)} <span className="text-zinc-700">/ {fmtClock(duration)}</span>
              </span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
