"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Waypoints,
  Plus,
  Trash2,
  Power,
  ArrowRight,
  ArrowLeft,
  Shuffle,
  X,
  MonitorSmartphone,
  Server,
} from "lucide-react";
import { cn, fmtBytes } from "@/lib/utils";
import { usePrefs } from "@/lib/prefs";

export interface TunnelRow {
  id: string;
  name: string;
  type: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  viaHost: string;
  status: string;
  bytesTotal: number;
  createdAt: string;
}

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  local: { label: "LOCAL -L", icon: ArrowRight, color: "#00ff9c" },
  remote: { label: "REMOTE -R", icon: ArrowLeft, color: "#3ee6ff" },
  dynamic: { label: "SOCKS -D", icon: Shuffle, color: "#a78bfa" },
};

function TunnelGraph({ tunnels }: { tunnels: TunnelRow[] }) {
  const active = tunnels.filter((t) => t.status === "active");
  const vias = Array.from(new Set(active.map((t) => t.viaHost)));
  const W = 640;
  const H = 210;
  const localX = 78;
  const viaY = (i: number) =>
    vias.length <= 1 ? H / 2 : 50 + (i * (H - 100)) / (vias.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <marker id="dot" markerWidth="4" markerHeight="4" refX="2" refY="2">
          <circle cx="2" cy="2" r="1.6" fill="#00ff9c" />
        </marker>
      </defs>
      {/* local node */}
      <g>
        <rect x={localX - 52} y={H / 2 - 24} width="104" height="48" fill="#050d09" stroke="#103324" />
        <text x={localX} y={H / 2 - 6} textAnchor="middle" fill="#d7e5dc" fontSize="10" fontFamily="monospace">
          operator
        </text>
        <text x={localX} y={H / 2 + 12} textAnchor="middle" fill="#5c6f66" fontSize="9" fontFamily="monospace">
          this browser
        </text>
      </g>
      {vias.map((via, i) => {
        const y = viaY(i);
        const viaX = 330;
        const related = active.filter((t) => t.viaHost === via);
        return (
          <g key={via}>
            {related.map((t, j) => {
              const meta = TYPE_META[t.type] ?? TYPE_META.local;
              const endX = 520;
              const endY = y + (j - (related.length - 1) / 2) * 18;
              return (
                <g key={t.id}>
                  <line
                    x1={localX + 52}
                    y1={H / 2}
                    x2={viaX - 58}
                    y2={y}
                    stroke={meta.color}
                    strokeOpacity="0.5"
                    strokeWidth="1.4"
                    strokeDasharray="5 7"
                    className="animate-dash-flow"
                  />
                  <line
                    x1={viaX + 58}
                    y1={y}
                    x2={endX - 10}
                    y2={endY}
                    stroke={meta.color}
                    strokeOpacity="0.5"
                    strokeWidth="1.4"
                    strokeDasharray="5 7"
                    className="animate-dash-flow"
                    markerEnd="url(#dot)"
                  />
                  <text x={endX + 6} y={endY + 3} fill={meta.color} fontSize="9" fontFamily="monospace" opacity="0.9">
                    :{t.remotePort || "socks"}
                  </text>
                </g>
              );
            })}
            <rect x={viaX - 58} y={y - 20} width="116" height="40" fill="#07130d" stroke="#103324" />
            <text x={viaX} y={y - 3} textAnchor="middle" fill="#00ff9c" fontSize="9.5" fontFamily="monospace">
              {via}
            </text>
            <text x={viaX} y={y + 12} textAnchor="middle" fill="#5c6f66" fontSize="8.5" fontFamily="monospace">
              {related.length} channel{related.length > 1 ? "s" : ""}
            </text>
          </g>
        );
      })}
      {active.length === 0 && (
        <text x={W / 2} y={H / 2 - 34} textAnchor="middle" fill="#3d4f46" fontSize="10" fontFamily="monospace" letterSpacing="3">
          ALL CHANNELS DORMANT — POWER ONE ON
        </text>
      )}
    </svg>
  );
}

export default function TunnelsClient({ initialTunnels }: { initialTunnels: TunnelRow[] }) {
  const { t } = usePrefs();
  const [rows, setRows] = useState(initialTunnels);
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "local",
    localPort: 8080,
    remoteHost: "127.0.0.1",
    remotePort: 80,
    viaHost: "bastion-eu",
  });

  const toggle = async (t: TunnelRow) => {
    const next = t.status === "active" ? "stopped" : "active";
    setRows((prev) => prev.map((r) => (r.id === t.id ? { ...r, status: next } : r)));
    await fetch(`/api/tunnels/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    }).catch(() => undefined);
  };

  const remove = async (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/tunnels/${id}`, { method: "DELETE" }).catch(() => undefined);
  };

  const create = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/tunnels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.tunnel) {
        setRows((prev) => [
          { ...json.tunnel, createdAt: json.tunnel.createdAt ?? new Date().toISOString() },
          ...prev,
        ]);
      }
      setModal(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* graph */}
      <div className="border border-line bg-panel p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Waypoints className="h-4 w-4 text-neon" />
            <span className="text-[11px] tracking-[0.3em] text-zinc-400 uppercase">
              Live cartography
            </span>
          </div>
          <div className="flex items-center gap-4 text-[9px] tracking-widest text-zinc-600 uppercase">
            <span className="flex items-center gap-1.5"><MonitorSmartphone className="h-3 w-3" /> edge</span>
            <span className="flex items-center gap-1.5"><Server className="h-3 w-3" /> fabric</span>
          </div>
        </div>
        <TunnelGraph tunnels={rows} />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] tracking-[0.3em] text-zinc-500 uppercase">
          {rows.filter((r) => r.status === "active").length} active / {rows.length} defined
        </span>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 border border-neon bg-neon px-4 py-2 text-[11px] font-bold tracking-[0.2em] text-black uppercase transition-colors hover:bg-neon-hi"
        >
          <Plus className="h-3.5 w-3.5" /> {t("btn.carve")}
        </button>
      </div>

      {/* list */}
      <div className="grid gap-3 md:grid-cols-2">
        <AnimatePresence initial={false}>
          {rows.map((t) => {
            const meta = TYPE_META[t.type] ?? TYPE_META.local;
            const active = t.status === "active";
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className={cn(
                  "group relative overflow-hidden border bg-panel p-5 transition-colors",
                  active ? "border-line hover:border-neon/40" : "border-line/60 opacity-70 hover:opacity-100",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-9 w-9 items-center justify-center border border-line bg-void"
                      style={{ color: meta.color }}
                    >
                      <meta.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-[13px] font-semibold text-zinc-100">{t.name}</div>
                      <div className="text-[9px] tracking-widest uppercase" style={{ color: meta.color }}>
                        {meta.label} · via {t.viaHost}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "flex items-center gap-1.5 border px-2 py-0.5 text-[9px] tracking-widest uppercase",
                      active ? "border-neon/40 bg-neon/10 text-neon" : "border-line text-zinc-500",
                    )}
                  >
                    <span className={cn("h-1 w-1 rounded-full", active ? "bg-neon animate-pulse-dot" : "bg-zinc-600")} />
                    {t.status}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 border border-line/70 bg-void px-3 py-2.5 text-[11px] text-zinc-400">
                  <span className="text-cyanx">:{t.localPort}</span>
                  <span className="text-zinc-700">⟶</span>
                  <span className="truncate">{t.viaHost}</span>
                  <span className="text-zinc-700">⟶</span>
                  <span className="truncate text-zinc-300">
                    {t.remoteHost}{t.remotePort ? `:${t.remotePort}` : ""}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-600">
                    {fmtBytes(t.bytesTotal)} moved
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => remove(t.id)}
                      className="border border-line p-2 text-zinc-500 transition-colors hover:border-dangerx/50 hover:text-dangerx"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => toggle(t)}
                      className={cn(
                        "flex items-center gap-1.5 border px-3 py-2 text-[10px] font-bold uppercase transition-all",
                        active
                          ? "border-amberx/50 bg-amberx/10 text-amberx hover:bg-amberx hover:text-black"
                          : "border-neon/50 bg-neon/10 text-neon hover:bg-neon hover:text-black",
                      )}
                    >
                      <Power className="h-3 w-3" />
                      {active ? "cut" : "power"}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* create modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setModal(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="hud-corner w-full max-w-md border border-line bg-void p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-display text-sm font-bold tracking-[0.25em] text-zinc-100 uppercase">
                  carve new tunnel
                </span>
                <button onClick={() => setModal(false)} className="text-zinc-600 hover:text-zinc-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="name — grafana-via-bastion"
                  className="h-9 w-full border border-line bg-panel px-3 text-[12px] text-zinc-200 outline-none focus:border-neon/60"
                />
                <div className="grid grid-cols-3 gap-2">
                  {(["local", "remote", "dynamic"] as const).map((tp) => (
                    <button
                      key={tp}
                      onClick={() => setForm({ ...form, type: tp })}
                      className={cn(
                        "border px-2 py-2 text-[10px] tracking-widest uppercase transition-colors",
                        form.type === tp
                          ? "border-neon/60 bg-neon/10 text-neon"
                          : "border-line text-zinc-500 hover:text-zinc-300",
                      )}
                    >
                      {tp}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] tracking-[0.25em] text-zinc-600 uppercase">local port</span>
                    <input
                      type="number"
                      value={form.localPort}
                      onChange={(e) => setForm({ ...form, localPort: Number(e.target.value) })}
                      className="h-9 w-full border border-line bg-panel px-3 text-[12px] text-zinc-200 outline-none focus:border-neon/60"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] tracking-[0.25em] text-zinc-600 uppercase">via host</span>
                    <input
                      value={form.viaHost}
                      onChange={(e) => setForm({ ...form, viaHost: e.target.value })}
                      className="h-9 w-full border border-line bg-panel px-3 text-[12px] text-zinc-200 outline-none focus:border-neon/60"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] tracking-[0.25em] text-zinc-600 uppercase">remote host</span>
                    <input
                      value={form.remoteHost}
                      onChange={(e) => setForm({ ...form, remoteHost: e.target.value })}
                      className="h-9 w-full border border-line bg-panel px-3 text-[12px] text-zinc-200 outline-none focus:border-neon/60"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[9px] tracking-[0.25em] text-zinc-600 uppercase">remote port</span>
                    <input
                      type="number"
                      value={form.remotePort}
                      onChange={(e) => setForm({ ...form, remotePort: Number(e.target.value) })}
                      className="h-9 w-full border border-line bg-panel px-3 text-[12px] text-zinc-200 outline-none focus:border-neon/60"
                    />
                  </label>
                </div>
              </div>
              <div className="mt-7 flex justify-end gap-3">
                <button
                  onClick={() => setModal(false)}
                  className="border border-line px-5 py-2 text-[11px] tracking-[0.2em] text-zinc-400 uppercase hover:text-zinc-200"
                >
                  abort
                </button>
                <button
                  onClick={create}
                  disabled={busy || !form.name.trim()}
                  className="border border-neon bg-neon px-5 py-2 text-[11px] font-bold tracking-[0.2em] text-black uppercase transition-colors hover:bg-neon-hi disabled:opacity-40"
                >
                  carve
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
