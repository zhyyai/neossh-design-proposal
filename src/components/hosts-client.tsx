"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Plus,
  Pencil,
  Trash2,
  Search,
  PlugZap,
  X,
  KeyRound,
  Lock,
  UserCheck,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { usePrefs } from "@/lib/prefs";

export interface HostRow {
  id: string;
  name: string;
  hostname: string;
  port: number;
  username: string;
  authType: string;
  groupName: string;
  tags: string[];
  color: string;
  notes: string | null;
  lastConnectedAt: string | null;
  createdAt: string;
}

const COLORS = ["#00ff9c", "#3ee6ff", "#ffb454", "#ff4d6d", "#a78bfa", "#e8ff6a"];

const EMPTY_FORM = {
  name: "",
  hostname: "",
  port: 22,
  username: "root",
  authType: "key",
  groupName: "default",
  tags: "",
  color: "#00ff9c",
  notes: "",
};

function AuthIcon({ type }: { type: string }) {
  if (type === "password") return <Lock className="h-3 w-3" />;
  if (type === "agent") return <UserCheck className="h-3 w-3" />;
  return <KeyRound className="h-3 w-3" />;
}

export default function HostsClient({ initialHosts }: { initialHosts: HostRow[] }) {
  const { t } = usePrefs();
  const [rows, setRows] = useState(initialHosts);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [modal, setModal] = useState<null | { mode: "create" } | { mode: "edit"; row: HostRow }>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmDelete, setConfirmDelete] = useState<HostRow | null>(null);
  const [busy, setBusy] = useState(false);

  const groups = useMemo(
    () => ["all", ...Array.from(new Set(rows.map((r) => r.groupName))).sort()],
    [rows],
  );

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return rows.filter(
      (r) =>
        (group === "all" || r.groupName === group) &&
        (!needle ||
          r.name.toLowerCase().includes(needle) ||
          r.hostname.includes(needle) ||
          r.tags.some((t) => t.toLowerCase().includes(needle))),
    );
  }, [rows, q, group]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setModal({ mode: "create" });
  };
  const openEdit = (row: HostRow) => {
    setForm({
      name: row.name,
      hostname: row.hostname,
      port: row.port,
      username: row.username,
      authType: row.authType,
      groupName: row.groupName,
      tags: row.tags.join(", "),
      color: row.color,
      notes: row.notes ?? "",
    });
    setModal({ mode: "edit", row });
  };

  const submit = async () => {
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      hostname: form.hostname.trim(),
      port: form.port,
      username: form.username.trim(),
      authType: form.authType,
      groupName: form.groupName.trim() || "default",
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      color: form.color,
      notes: form.notes.trim() || null,
    };
    try {
      if (modal?.mode === "edit") {
        const res = await fetch(`/api/hosts/${modal.row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.host) {
          setRows((prev) =>
            prev.map((r) =>
              r.id === modal.row.id
                ? {
                    ...r,
                    ...json.host,
                    tags: json.host.tags ?? [],
                    lastConnectedAt: json.host.lastConnectedAt ?? null,
                    createdAt: r.createdAt,
                  }
                : r,
            ),
          );
        }
      } else {
        const res = await fetch("/api/hosts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.host) {
          setRows((prev) => [
            ...prev,
            {
              ...json.host,
              tags: json.host.tags ?? [],
              lastConnectedAt: null,
              createdAt: json.host.createdAt ?? new Date().toISOString(),
            },
          ]);
        }
      }
      setModal(null);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    setBusy(true);
    try {
      await fetch(`/api/hosts/${confirmDelete.id}`, { method: "DELETE" });
      setRows((prev) => prev.filter((r) => r.id !== confirmDelete.id));
      setConfirmDelete(null);
    } finally {
      setBusy(false);
    }
  };

  const connect = (h: HostRow) => {
    fetch(`/api/hosts/${h.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ touch: true }),
    }).catch(() => undefined);
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* toolbar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex min-w-56 flex-1 items-center gap-2.5 border border-line bg-panel px-3.5">
          <Search className="h-3.5 w-3.5 text-zinc-600" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="filter by name, ip, tag…"
            className="h-10 flex-1 bg-transparent text-[12px] text-zinc-200 outline-none placeholder:text-zinc-600"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setGroup(g)}
              className={cn(
                "border px-3 py-2 text-[10px] tracking-[0.2em] uppercase transition-all",
                group === g
                  ? "border-neon/60 bg-neon/10 text-neon"
                  : "border-line bg-panel text-zinc-500 hover:text-zinc-300",
              )}
            >
              {g}
            </button>
          ))}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 border border-neon bg-neon px-4 py-2 text-[11px] font-bold tracking-[0.2em] text-black uppercase transition-colors hover:bg-neon-hi"
        >
          <Plus className="h-3.5 w-3.5" /> {t("btn.addHost")}
        </button>
      </div>

      {/* table head */}
      <div className="hidden grid-cols-[26px_1.3fr_1.5fr_0.8fr_1.1fr_0.7fr_0.9fr] gap-3 border-b border-line px-4 pb-3 text-[9px] tracking-[0.3em] text-zinc-600 uppercase md:grid">
        <span />
        <span>node</span>
        <span>endpoint</span>
        <span>auth</span>
        <span>tags</span>
        <span>last link</span>
        <span className="text-right">ops</span>
      </div>

      {/* rows */}
      <div className="divide-y divide-line/50 border-b border-line">
        <AnimatePresence initial={false}>
          {filtered.map((h) => (
            <motion.div
              key={h.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="group grid grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-panel/70 md:grid-cols-[26px_1.3fr_1.5fr_0.8fr_1.1fr_0.7fr_0.9fr] md:items-center md:py-3.5"
            >
              <span
                className="hidden h-2 w-2 rounded-full md:block"
                style={{ background: h.color, boxShadow: `0 0 8px ${h.color}` }}
              />
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-zinc-100">
                  {h.name}
                </div>
                <div className="text-[10px] tracking-wider text-zinc-600 uppercase">
                  {h.groupName}
                </div>
              </div>
              <div className="truncate text-[12px] text-zinc-400">
                <span className="text-zinc-600">{h.username}@</span>
                {h.hostname}
                <span className="text-zinc-600">:{h.port}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                <AuthIcon type={h.authType} />
                {h.authType}
              </div>
              <div className="flex flex-wrap gap-1">
                {h.tags.slice(0, 3).map((t) => (
                  <span
                    key={t}
                    className="border border-line bg-void px-1.5 py-0.5 text-[9px] text-zinc-500"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-zinc-600">
                {h.lastConnectedAt ? timeAgo(h.lastConnectedAt) : "never"}
              </span>
              <div className="flex items-center justify-start gap-1.5 md:justify-end">
                <Link
                  href={`/terminal?host=${h.id}`}
                  onClick={() => connect(h)}
                  className="flex items-center gap-1.5 border border-neon/40 bg-neon/10 px-2.5 py-1.5 text-[10px] text-neon opacity-100 transition-all hover:bg-neon hover:text-black md:opacity-0 md:group-hover:opacity-100"
                >
                  <PlugZap className="h-3 w-3" /> LINK
                </Link>
                <button
                  onClick={() => openEdit(h)}
                  className="border border-line p-1.5 text-zinc-500 transition-colors hover:border-cyanx/50 hover:text-cyanx"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={() => setConfirmDelete(h)}
                  className="border border-line p-1.5 text-zinc-500 transition-colors hover:border-dangerx/50 hover:text-dangerx"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
            <Server className="h-6 w-6" />
            <span className="text-[11px] tracking-[0.25em] uppercase">
              no nodes matched this filter
            </span>
          </div>
        )}
      </div>

      {/* create/edit modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="hud-corner w-full max-w-lg border border-line bg-void p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-display text-sm font-bold tracking-[0.25em] text-zinc-100 uppercase">
                  {modal.mode === "edit" ? "reconfigure node" : "register node"}
                </span>
                <button onClick={() => setModal(null)} className="text-zinc-600 hover:text-zinc-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    ["name", "alias", "core-prod-01"],
                    ["hostname", "ip / dns", "10.0.4.21"],
                    ["username", "user", "deploy"],
                    ["groupName", "group", "production"],
                  ] as const
                ).map(([key, label, ph]) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-[9px] tracking-[0.25em] text-zinc-600 uppercase">
                      {label}
                    </span>
                    <input
                      value={String(form[key])}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={ph}
                      className="h-9 w-full border border-line bg-panel px-3 text-[12px] text-zinc-200 outline-none focus:border-neon/60"
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="mb-1.5 block text-[9px] tracking-[0.25em] text-zinc-600 uppercase">
                    port
                  </span>
                  <input
                    type="number"
                    value={form.port}
                    onChange={(e) => setForm({ ...form, port: Number(e.target.value) })}
                    className="h-9 w-full border border-line bg-panel px-3 text-[12px] text-zinc-200 outline-none focus:border-neon/60"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[9px] tracking-[0.25em] text-zinc-600 uppercase">
                    auth
                  </span>
                  <select
                    value={form.authType}
                    onChange={(e) => setForm({ ...form, authType: e.target.value })}
                    className="h-9 w-full border border-line bg-panel px-2 text-[12px] text-zinc-200 outline-none focus:border-neon/60"
                  >
                    <option value="key">ssh key</option>
                    <option value="password">password</option>
                    <option value="agent">agent fwd</option>
                  </select>
                </label>
                <label className="col-span-2 block">
                  <span className="mb-1.5 block text-[9px] tracking-[0.25em] text-zinc-600 uppercase">
                    tags · comma separated
                  </span>
                  <input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="web, critical, nginx"
                    className="h-9 w-full border border-line bg-panel px-3 text-[12px] text-zinc-200 outline-none focus:border-neon/60"
                  />
                </label>
                <div className="col-span-2">
                  <span className="mb-1.5 block text-[9px] tracking-[0.25em] text-zinc-600 uppercase">
                    signal color
                  </span>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setForm({ ...form, color: c })}
                        className={cn(
                          "h-6 w-6 rounded-full transition-transform",
                          form.color === c && "scale-125 ring-2 ring-white/40",
                        )}
                        style={{ background: c, boxShadow: `0 0 10px ${c}66` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-7 flex justify-end gap-3">
                <button
                  onClick={() => setModal(null)}
                  className="border border-line px-5 py-2 text-[11px] tracking-[0.2em] text-zinc-400 uppercase hover:text-zinc-200"
                >
                  abort
                </button>
                <button
                  onClick={submit}
                  disabled={busy || !form.name.trim() || !form.hostname.trim()}
                  className="border border-neon bg-neon px-5 py-2 text-[11px] font-bold tracking-[0.2em] text-black uppercase transition-colors hover:bg-neon-hi disabled:opacity-40"
                >
                  {modal.mode === "edit" ? "apply" : "register"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setConfirmDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm border border-dangerx/40 bg-void p-6"
            >
              <div className="text-sm font-semibold text-dangerx">
                Sever link to {confirmDelete.name}?
              </div>
              <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
                This removes the node from the fabric inventory. Recorded
                sessions in the audit trail are kept sealed.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="border border-line px-4 py-2 text-[11px] text-zinc-400 uppercase hover:text-zinc-200"
                >
                  keep
                </button>
                <button
                  onClick={doDelete}
                  disabled={busy}
                  className="border border-dangerx bg-dangerx/15 px-4 py-2 text-[11px] font-bold text-dangerx uppercase transition-colors hover:bg-dangerx hover:text-black"
                >
                  sever
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
