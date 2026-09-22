"use client";

import { useMemo, useState } from "react";
import { ScrollText, TerminalSquare, Search, ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";
import { cn, fmtDuration, timeAgo } from "@/lib/utils";
import { usePrefs } from "@/lib/prefs";

interface SessionRow {
  id: string;
  hostLabel: string;
  target: string;
  mode: string;
  status: string;
  exitCode: number | null;
  startedAt: string;
  endedAt: string | null;
}
interface CommandRow {
  id: number;
  sessionId: string;
  hostLabel: string;
  command: string;
  risk: string;
  executedAt: string;
}

const RISK_META: Record<string, { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  safe: { icon: ShieldCheck, cls: "border-neon/30 bg-neon/5 text-neon" },
  warn: { icon: TriangleAlert, cls: "border-amberx/40 bg-amberx/10 text-amberx" },
  danger: { icon: ShieldAlert, cls: "border-dangerx/40 bg-dangerx/10 text-dangerx" },
};

export default function AuditClient({
  sessions,
  commands,
}: {
  sessions: SessionRow[];
  commands: CommandRow[];
}) {
  const { t } = usePrefs();
  const [tab, setTab] = useState<"commands" | "sessions">("commands");
  const [q, setQ] = useState("");
  const [risk, setRisk] = useState<string>("all");

  const filteredCommands = useMemo(() => {
    const needle = q.toLowerCase();
    return commands.filter(
      (c) =>
        (risk === "all" || c.risk === risk) &&
        (!needle || c.command.toLowerCase().includes(needle) || c.hostLabel.toLowerCase().includes(needle)),
    );
  }, [commands, q, risk]);

  const filteredSessions = useMemo(() => {
    const needle = q.toLowerCase();
    return sessions.filter(
      (s) => !needle || s.hostLabel.toLowerCase().includes(needle) || s.target.includes(needle),
    );
  }, [sessions, q]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex border border-line">
          {(
            [
              ["commands", TerminalSquare, `${commands.length} entries`],
              ["sessions", ScrollText, `${sessions.length} links`],
            ] as const
          ).map(([key, Icon, sub]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "flex items-center gap-2.5 px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase transition-colors",
                tab === key ? "bg-neon/10 text-neon" : "bg-panel text-zinc-500 hover:text-zinc-300",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(key === "commands" ? "aud.commands" : "aud.sessions")}
              <span className="text-[9px] text-zinc-600">{sub}</span>
            </button>
          ))}
        </div>
        <div className="flex min-w-52 flex-1 items-center gap-2.5 border border-line bg-panel px-3.5">
          <Search className="h-3.5 w-3.5 text-zinc-600" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="grep the sealed trail…"
            className="h-10 flex-1 bg-transparent text-[12px] text-zinc-200 outline-none placeholder:text-zinc-600"
          />
        </div>
        {tab === "commands" && (
          <div className="flex gap-1.5">
            {["all", "safe", "warn", "danger"].map((r) => (
              <button
                key={r}
                onClick={() => setRisk(r)}
                className={cn(
                  "border px-3 py-2 text-[10px] tracking-[0.2em] uppercase transition-all",
                  risk === r
                    ? r === "danger"
                      ? "border-dangerx/60 bg-dangerx/10 text-dangerx"
                      : r === "warn"
                        ? "border-amberx/60 bg-amberx/10 text-amberx"
                        : "border-neon/60 bg-neon/10 text-neon"
                    : "border-line bg-panel text-zinc-500 hover:text-zinc-300",
                )}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "commands" ? (
        <div className="border border-line bg-panel">
          <div className="hidden grid-cols-[150px_90px_1fr_110px] gap-4 border-b border-line px-5 py-3 text-[9px] tracking-[0.3em] text-zinc-600 uppercase md:grid">
            <span>node</span>
            <span>risk</span>
            <span>command payload</span>
            <span className="text-right">timestamp</span>
          </div>
          <div className="divide-y divide-line/50">
            {filteredCommands.map((c) => {
              const meta = RISK_META[c.risk] ?? RISK_META.safe;
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-1 gap-2 px-5 py-3 transition-colors hover:bg-lift/60 md:grid-cols-[150px_90px_1fr_110px] md:items-center md:gap-4"
                >
                  <span className="truncate text-[11px] text-zinc-400">{c.hostLabel}</span>
                  <span>
                    <span className={cn("inline-flex items-center gap-1.5 border px-2 py-0.5 text-[9px] tracking-widest uppercase", meta.cls)}>
                      <meta.icon className="h-2.5 w-2.5" />
                      {c.risk}
                    </span>
                  </span>
                  <code className="truncate text-[12px] text-zinc-200">
                    <span className="mr-2 text-zinc-600">❯</span>
                    {c.command}
                  </code>
                  <span className="text-left text-[10px] text-zinc-600 md:text-right">
                    {timeAgo(c.executedAt)}
                  </span>
                </div>
              );
            })}
            {filteredCommands.length === 0 && (
              <div className="py-16 text-center text-[11px] tracking-[0.25em] text-zinc-600 uppercase">
                zero entries matched
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-line bg-panel">
          <div className="hidden grid-cols-[170px_150px_90px_100px_90px_1fr] gap-4 border-b border-line px-5 py-3 text-[9px] tracking-[0.3em] text-zinc-600 uppercase md:grid">
            <span>node</span>
            <span>endpoint</span>
            <span>mode</span>
            <span>duration</span>
            <span>exit</span>
            <span className="text-right">status / opened</span>
          </div>
          <div className="divide-y divide-line/50">
            {filteredSessions.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-1 gap-2 px-5 py-3 transition-colors hover:bg-lift/60 md:grid-cols-[170px_150px_90px_100px_90px_1fr] md:items-center md:gap-4"
              >
                <span className="flex items-center gap-2 truncate text-[12px] text-zinc-200">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", s.status === "active" ? "bg-neon animate-pulse-dot" : "bg-zinc-600")} />
                  {s.hostLabel}
                </span>
                <span className="truncate text-[11px] text-zinc-500">{s.target}</span>
                <span className="text-[10px] tracking-widest text-zinc-600 uppercase">{s.mode}</span>
                <span className="text-[11px] text-zinc-400">{fmtDuration(s.startedAt, s.endedAt)}</span>
                <span className="text-[11px] text-zinc-500">{s.exitCode ?? "—"}</span>
                <span className="flex items-center justify-start gap-3 md:justify-end">
                  <span
                    className={cn(
                      "border px-2 py-0.5 text-[9px] tracking-widest uppercase",
                      s.status === "active" ? "border-neon/40 bg-neon/10 text-neon" : "border-line text-zinc-500",
                    )}
                  >
                    {s.status}
                  </span>
                  <span className="text-[10px] text-zinc-600">{timeAgo(s.startedAt)}</span>
                </span>
              </div>
            ))}
            {filteredSessions.length === 0 && (
              <div className="py-16 text-center text-[11px] tracking-[0.25em] text-zinc-600 uppercase">
                zero links matched
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-[9px] tracking-[0.25em] text-zinc-600 uppercase">
        <span>append-only sealed store · sha-chained</span>
        <span>retention: forever</span>
      </div>
    </div>
  );
}
