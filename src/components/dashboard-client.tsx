"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Server,
  SquareTerminal,
  TerminalSquare,
  ShieldAlert,
  Activity,
  Radio,
  ArrowUpRight,
  Plus,
  Cpu,
  MemoryStick,
  HardDrive,
  Gauge,
} from "lucide-react";
import { cn, fmtBytes, fmtDuration, timeAgo } from "@/lib/utils";
import { usePrefs } from "@/lib/prefs";

interface Stats {
  hosts: number;
  sessions: number;
  commands: number;
  danger: number;
}
interface RecentSession {
  id: string;
  hostLabel: string;
  target: string;
  mode: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
}
interface HostChip {
  id: string;
  name: string;
  hostname: string;
  groupName: string;
  color: string;
}
interface LiveMeta {
  id: string;
  label: string;
  target: string;
  status: string;
  createdAt: number;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  sub,
  delay,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  sub: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="group relative overflow-hidden border border-line bg-panel p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
            {label}
          </div>
          <div
            className={cn(
              "mt-3 font-display text-4xl font-bold tabular-nums",
              accent,
            )}
          >
            {value}
          </div>
          <div className="mt-1.5 text-[10px] text-zinc-600">{sub}</div>
        </div>
        <span className="flex h-10 w-10 items-center justify-center border border-line bg-void text-zinc-500 transition-colors group-hover:border-neon/40 group-hover:text-neon">
          <Icon className="h-4.5 w-4.5" />
        </span>
      </div>
      <span className="absolute bottom-0 left-0 h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-neon to-transparent transition-transform duration-500 group-hover:scale-x-100" />
    </motion.div>
  );
}

interface Metrics {
  cpu: number;
  memTotal: number;
  memUsed: number;
  diskTotal: number;
  diskUsed: number;
  load: [number, number, number];
  uptimeSec: number;
  ts: number;
}

function NodeTelemetry() {
  const [m, setM] = useState<Metrics | null>(null);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/metrics", { cache: "no-store" });
        const json = await res.json();
        if (alive) setM(json);
      } catch {
        /* noop */
      }
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const memPct = m && m.memTotal > 0 ? (m.memUsed / m.memTotal) * 100 : 0;
  const diskPct = m && m.diskTotal > 0 ? (m.diskUsed / m.diskTotal) * 100 : 0;

  const cells: Array<{
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    label: string;
    value: string;
    sub: string;
    pct: number;
    color: string;
  }> = [
    {
      icon: Cpu,
      label: "CPU",
      value: m ? `${m.cpu.toFixed(1)}%` : "—",
      sub: m ? `load ${m.load.map((l) => l.toFixed(2)).join(" · ")}` : "sampling…",
      pct: m?.cpu ?? 0,
      color: "#00ff9c",
    },
    {
      icon: MemoryStick,
      label: "MEMORY",
      value: m ? fmtBytes(m.memUsed) : "—",
      sub: m ? `of ${fmtBytes(m.memTotal)} resident` : "—",
      pct: memPct,
      color: "#3ee6ff",
    },
    {
      icon: HardDrive,
      label: "DISK /",
      value: m ? fmtBytes(m.diskUsed) : "—",
      sub: m ? `of ${fmtBytes(m.diskTotal)} mounted` : "—",
      pct: diskPct,
      color: "#ffb454",
    },
    {
      icon: Gauge,
      label: "UPTIME",
      value: m ? fmtDuration(new Date(m.ts - m.uptimeSec * 1000)) : "—",
      sub: "sandbox node · /proc live",
      pct: 100,
      color: "#a78bfa",
    },
  ];

  return (
    <div className="grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
      {cells.map(({ icon: Icon, label, value, sub, pct, color }) => (
        <div key={label} className="bg-panel p-5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
              <Icon className="h-3.5 w-3.5" style={{ color }} />
              {label}
            </span>
            <span className="h-1 w-1 rounded-full bg-neon animate-pulse-dot" />
          </div>
          <div className="mt-3 font-display text-xl font-bold text-zinc-50 tabular-nums">
            {value}
          </div>
          <div className="mt-1 text-[10px] text-zinc-600">{sub}</div>
          <div className="mt-3 h-[3px] w-full overflow-hidden rounded-sm bg-edge">
            <div
              className="h-full transition-all duration-700"
              style={{ width: `${Math.min(pct, 100)}%`, background: color, boxShadow: `0 0 8px ${color}` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityChart({ data }: { data: { day: string; value: number }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 560;
  const H = 150;
  const step = W / data.length;
  const pts = data.map((d, i) => ({
    x: i * step + step / 2,
    y: H - 14 - (d.value / max) * (H - 40),
  }));
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const area = `${path} L${pts[pts.length - 1].x},${H - 14} L${pts[0].x},${H - 14} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        <defs>
          <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ff9c" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#00ff9c" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1="0"
            x2={W}
            y1={H * f}
            y2={H * f}
            stroke="#103324"
            strokeDasharray="3 5"
            strokeWidth="1"
          />
        ))}
        <motion.path
          d={area}
          fill="url(#areaGlow)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.4 }}
        />
        <motion.path
          d={path}
          fill="none"
          stroke="#00ff9c"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          style={{ filter: "drop-shadow(0 0 6px rgba(0,255,156,0.5))" }}
        />
        {pts.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3.2"
            fill="#020604"
            stroke="#00ff9c"
            strokeWidth="1.6"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + i * 0.1 }}
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[9px] tracking-widest text-zinc-600">
        {data.map((d) => (
          <span key={d.day}>{d.day}</span>
        ))}
      </div>
    </div>
  );
}

function Radar() {
  return (
    <div className="relative mx-auto h-44 w-44">
      <div className="absolute inset-0 rounded-full border border-line" />
      <div className="absolute inset-[22%] rounded-full border border-line" />
      <div className="absolute inset-[42%] rounded-full border border-line" />
      <div className="absolute inset-x-1/2 inset-y-0 w-px bg-line" />
      <div className="absolute inset-x-0 inset-y-1/2 h-px bg-line" />
      <div
        className="absolute inset-0 animate-radar rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(0,255,156,0.4), transparent 70deg, transparent)",
        }}
      />
      {[
        { top: "30%", left: "62%", c: "#00ff9c" },
        { top: "58%", left: "30%", c: "#3ee6ff" },
        { top: "66%", left: "68%", c: "#ffb454" },
      ].map((b, i) => (
        <span
          key={i}
          className="absolute h-1.5 w-1.5 rounded-full animate-pulse-dot"
          style={{ top: b.top, left: b.left, background: b.c }}
        />
      ))}
      <span className="absolute inset-x-0 -bottom-6 text-center text-[9px] tracking-[0.3em] text-zinc-600 uppercase">
        mesh sweep · 3 nodes
      </span>
    </div>
  );
}

export default function DashboardClient({
  stats,
  perDay,
  recentSessions,
  hosts,
}: {
  stats: Stats;
  perDay: { day: string; value: number }[];
  recentSessions: RecentSession[];
  hosts: HostChip[];
}) {
  const { t } = usePrefs();
  const [live, setLive] = useState<LiveMeta[]>([]);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/terminal", { cache: "no-store" });
        const json = await res.json();
        if (alive) setLive(json.sessions ?? []);
      } catch {
        /* noop */
      }
    };
    poll();
    const t = setInterval(poll, 4000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const liveActive = live.filter((s) => s.status === "active");

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("dash.hostsIn")} value={stats.hosts} icon={Server} accent="text-neon" sub={t("dash.acrossGroups")} delay={0} />
        <StatCard label={t("dash.ptyLive")} value={liveActive.length} icon={SquareTerminal} accent="text-cyanx" sub={t("dash.polled")} delay={0.06} />
        <StatCard label={t("dash.cmdAudited")} value={stats.commands} icon={TerminalSquare} accent="text-zinc-100" sub={t("dash.keystroke")} delay={0.12} />
        <StatCard label={t("dash.dangerBlocked")} value={stats.danger} icon={ShieldAlert} accent="text-dangerx" sub={t("dash.quarantined")} delay={0.18} />
      </div>

      {/* sandbox node telemetry */}
      <NodeTelemetry />

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        {/* activity */}
        <div className="border border-line bg-panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="h-4 w-4 text-neon" />
              <span className="text-[11px] tracking-[0.3em] text-zinc-400 uppercase">
                {t("dash.velocity")}
              </span>
            </div>
            <span className="border border-line px-2 py-0.5 text-[9px] text-zinc-600">
              {t("dash.sealed")}
            </span>
          </div>
          <ActivityChart data={perDay} />
        </div>

        {/* live sessions */}
        <div className="flex flex-col border border-line bg-panel p-6">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Radio className="h-4 w-4 text-cyanx" />
              <span className="text-[11px] tracking-[0.3em] text-zinc-400 uppercase">
                {t("dash.liveChannels")}
              </span>
            </div>
            <Link
              href="/terminal"
              className="flex items-center gap-1.5 border border-neon/50 bg-neon/10 px-2.5 py-1 text-[10px] text-neon transition-colors hover:bg-neon hover:text-black"
            >
              <Plus className="h-3 w-3" /> {t("dash.new")}
            </Link>
          </div>
          {liveActive.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-6">
              <Radar />
              <p className="mt-8 text-center text-[11px] text-zinc-600">
                {t("dash.quiet")}
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-2">
              {liveActive.map((s) => (
                <Link
                  key={s.id}
                  href="/terminal"
                  className="group flex items-center gap-3 border border-line bg-void px-3.5 py-3 transition-colors hover:border-neon/50"
                >
                  <span className="h-2 w-2 rounded-full bg-neon animate-pulse-dot" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] text-zinc-200">
                      {s.label}
                    </div>
                    <div className="truncate text-[10px] text-zinc-600">
                      {s.target} · up {fmtDuration(new Date(s.createdAt))}
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600 transition-colors group-hover:text-neon" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        {/* recent sessions */}
        <div className="border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <span className="text-[11px] tracking-[0.3em] text-zinc-400 uppercase">
              {t("dash.recent")}
            </span>
            <Link
              href="/audit"
              className="text-[10px] tracking-[0.25em] text-neon uppercase hover:text-neon-hi"
            >
              {t("dash.fullTrail")}
            </Link>
          </div>
          <div className="divide-y divide-line/60">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-6 py-3">
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    s.status === "active" ? "bg-neon animate-pulse-dot" : "bg-zinc-600",
                  )}
                />
                <span className="w-36 truncate text-[12px] text-zinc-200">
                  {s.hostLabel}
                </span>
                <span className="hidden w-32 truncate text-[11px] text-zinc-600 sm:inline">
                  {s.target}
                </span>
                <span className="hidden text-[10px] text-zinc-600 md:inline">
                  {fmtDuration(s.startedAt, s.endedAt)}
                </span>
                <span className="ml-auto text-[10px] text-zinc-600">
                  {timeAgo(s.startedAt)}
                </span>
                <span
                  className={cn(
                    "border px-1.5 py-0.5 text-[9px] tracking-widest uppercase",
                    s.status === "active"
                      ? "border-neon/40 bg-neon/10 text-neon"
                      : "border-line text-zinc-600",
                  )}
                >
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* quick connect */}
        <div className="border border-line bg-panel">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <span className="text-[11px] tracking-[0.3em] text-zinc-400 uppercase">
              {t("dash.quickConnect")}
            </span>
            <Link
              href="/hosts"
              className="text-[10px] tracking-[0.25em] text-neon uppercase hover:text-neon-hi"
            >
              {t("dash.allHosts")}
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4">
            {hosts.slice(0, 8).map((h) => (
              <Link
                key={h.id}
                href={`/terminal?host=${h.id}`}
                className="group flex items-center gap-2.5 border border-line bg-void px-3 py-2.5 transition-all hover:border-transparent"
                style={{ ["--hc" as string]: h.color }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: h.color, boxShadow: `0 0 8px ${h.color}` }}
                />
                <div className="min-w-0">
                  <div className="truncate text-[11px] text-zinc-200 group-hover:text-[var(--hc)]">
                    {h.name}
                  </div>
                  <div className="truncate text-[9px] text-zinc-600">
                    {h.groupName}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
