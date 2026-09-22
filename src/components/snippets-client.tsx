"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Braces, Plus, Copy, Play, Trash2, X, Check, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefs } from "@/lib/prefs";

export interface SnippetRow {
  id: string;
  title: string;
  command: string;
  description: string | null;
  category: string;
  danger: boolean;
  usageCount: number;
  createdAt: string;
}

const CATS = ["all", "diagnostics", "network", "logs", "disk", "security", "tunnel", "containers", "maintenance", "process", "general"];

export default function SnippetsClient({ initialSnippets }: { initialSnippets: SnippetRow[] }) {
  const { t } = usePrefs();
  const [rows, setRows] = useState(initialSnippets);
  const [cat, setCat] = useState("all");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", command: "", description: "", category: "general", danger: false });
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(
    () => (cat === "all" ? rows : rows.filter((r) => r.category === cat)),
    [rows, cat],
  );
  const usedCats = useMemo(
    () => CATS.filter((c) => c === "all" || rows.some((r) => r.category === c)),
    [rows],
  );

  const copy = async (s: SnippetRow) => {
    try {
      await navigator.clipboard.writeText(s.command);
      setCopied(s.id);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      /* noop */
    }
  };

  const fire = (s: SnippetRow) => {
    fetch(`/api/snippets/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inc: true }),
    }).catch(() => undefined);
  };

  const create = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.snippet) {
        setRows((prev) => [
          { ...json.snippet, createdAt: json.snippet.createdAt ?? new Date().toISOString() },
          ...prev,
        ]);
      }
      setModal(false);
      setForm({ title: "", command: "", description: "", category: "general", danger: false });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/snippets/${id}`, { method: "DELETE" });
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {usedCats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "border px-3 py-2 text-[10px] tracking-[0.2em] uppercase transition-all",
                cat === c
                  ? "border-neon/60 bg-neon/10 text-neon"
                  : "border-line bg-panel text-zinc-500 hover:text-zinc-300",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 border border-neon bg-neon px-4 py-2 text-[11px] font-bold tracking-[0.2em] text-black uppercase transition-colors hover:bg-neon-hi"
        >
          <Plus className="h-3.5 w-3.5" /> {t("btn.forge")}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AnimatePresence initial={false}>
          {filtered.map((s, i) => (
            <motion.div
              key={s.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.04, 0.3) }}
              className={cn(
                "group relative flex flex-col border bg-panel p-5 transition-colors",
                s.danger ? "border-dangerx/30 hover:border-dangerx/60" : "border-line hover:border-neon/40",
              )}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Braces className={cn("h-4 w-4", s.danger ? "text-dangerx" : "text-neon")} />
                  <span className="text-[13px] font-semibold text-zinc-100">{s.title}</span>
                </div>
                {s.danger && (
                  <span className="flex items-center gap-1 border border-dangerx/40 bg-dangerx/10 px-1.5 py-0.5 text-[9px] tracking-widest text-dangerx uppercase">
                    <TriangleAlert className="h-2.5 w-2.5" /> blast
                  </span>
                )}
              </div>
              <div className="mb-3 flex-1 border border-line/70 bg-void p-3 text-[11.5px] leading-relaxed break-all text-cyanx/90">
                <span className="text-zinc-600">❯ </span>
                {s.command}
              </div>
              {s.description && (
                <p className="mb-4 text-[11px] leading-relaxed text-zinc-500">{s.description}</p>
              )}
              <div className="mt-auto flex items-center justify-between">
                <div className="flex items-center gap-2 text-[9px] tracking-widest text-zinc-600 uppercase">
                  <span className="border border-line px-1.5 py-0.5">{s.category}</span>
                  <span>{s.usageCount}× fired</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copy(s)}
                    className="border border-line p-2 text-zinc-500 transition-colors hover:border-neon/50 hover:text-neon"
                    title="copy"
                  >
                    {copied === s.id ? <Check className="h-3 w-3 text-neon" /> : <Copy className="h-3 w-3" />}
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="border border-line p-2 text-zinc-500 transition-colors hover:border-dangerx/50 hover:text-dangerx"
                    title="delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                  <Link
                    href={`/terminal?run=${encodeURIComponent(s.command)}`}
                    onClick={() => fire(s)}
                    className="flex items-center gap-1.5 border border-neon/50 bg-neon/10 px-3 py-2 text-[10px] font-bold text-neon uppercase transition-all hover:bg-neon hover:text-black"
                  >
                    <Play className="h-3 w-3" /> fire
                  </Link>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-20 text-zinc-600">
          <Braces className="h-6 w-6" />
          <span className="text-[11px] tracking-[0.25em] uppercase">armory is empty in this rack</span>
        </div>
      )}

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
              className="hud-corner w-full max-w-lg border border-line bg-void p-6"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="font-display text-sm font-bold tracking-[0.25em] text-zinc-100 uppercase">
                  forge new snippet
                </span>
                <button onClick={() => setModal(false)} className="text-zinc-600 hover:text-zinc-200">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="title — e.g. hunt memory hogs"
                  className="h-9 w-full border border-line bg-panel px-3 text-[12px] text-zinc-200 outline-none focus:border-neon/60"
                />
                <textarea
                  value={form.command}
                  onChange={(e) => setForm({ ...form, command: e.target.value })}
                  placeholder="command — ps aux --sort=-%mem | head -15"
                  rows={3}
                  className="w-full border border-line bg-panel px-3 py-2.5 font-mono text-[12px] text-cyanx outline-none focus:border-neon/60"
                />
                <input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="description (optional)"
                  className="h-9 w-full border border-line bg-panel px-3 text-[12px] text-zinc-200 outline-none focus:border-neon/60"
                />
                <div className="flex items-center gap-3">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="h-9 flex-1 border border-line bg-panel px-2 text-[12px] text-zinc-200 outline-none focus:border-neon/60"
                  >
                    {CATS.filter((c) => c !== "all").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setForm({ ...form, danger: !form.danger })}
                    className={cn(
                      "flex h-9 items-center gap-2 border px-3 text-[10px] tracking-widest uppercase transition-colors",
                      form.danger
                        ? "border-dangerx/60 bg-dangerx/10 text-dangerx"
                        : "border-line text-zinc-500 hover:text-zinc-300",
                    )}
                  >
                    <TriangleAlert className="h-3 w-3" />
                    blast radius
                  </button>
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
                  disabled={busy || !form.title.trim() || !form.command.trim()}
                  className="border border-neon bg-neon px-5 py-2 text-[11px] font-bold tracking-[0.2em] text-black uppercase transition-colors hover:bg-neon-hi disabled:opacity-40"
                >
                  forge
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
