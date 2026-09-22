"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  SquareTerminal,
  Server,
  Braces,
  LayoutDashboard,
  Waypoints,
  ScrollText,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Host, Snippet } from "@/db/schema";

interface Item {
  id: string;
  label: string;
  hint: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // reset query/selection when the palette opens (render-phase adjustment)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setQ("");
      setIdx(0);
    }
  }
  // reset selection when the query changes (render-phase adjustment)
  const [prevQ, setPrevQ] = useState(q);
  if (q !== prevQ) {
    setPrevQ(q);
    setIdx(0);
  }

  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 30);
    Promise.all([
      fetch("/api/hosts").then((r) => r.json()),
      fetch("/api/snippets").then((r) => r.json()),
    ])
      .then(([h, s]) => {
        setHosts(h.hosts ?? []);
        setSnippets(s.snippets ?? []);
      })
      .catch(() => undefined);
    return () => clearTimeout(focusTimer);
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => {
      router.push(href);
      onClose();
    };
    const base: Item[] = [
      { id: "a1", label: "Open dashboard", hint: "navigate", group: "Actions", icon: LayoutDashboard, run: go("/dashboard") },
      { id: "a2", label: "Launch sandbox terminal", hint: "pts/os shell", group: "Actions", icon: SquareTerminal, run: go("/terminal") },
      { id: "a3", label: "Tunnel cartography", hint: "navigate", group: "Actions", icon: Waypoints, run: go("/tunnels") },
      { id: "a4", label: "Audit trail", hint: "navigate", group: "Actions", icon: ScrollText, run: go("/audit") },
    ];
    const hostItems: Item[] = hosts.map((h) => ({
      id: `h-${h.id}`,
      label: `connect ${h.name}`,
      hint: `${h.username}@${h.hostname}:${h.port}`,
      group: "Hosts",
      icon: Server,
      run: () => {
        fetch(`/api/hosts/${h.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ touch: true }),
        }).catch(() => undefined);
        go(`/terminal?host=${h.id}`)();
      },
    }));
    const snipItems: Item[] = snippets.slice(0, 6).map((s) => ({
      id: `s-${s.id}`,
      label: s.title,
      hint: s.command.length > 44 ? `${s.command.slice(0, 44)}…` : s.command,
      group: "Snippets",
      icon: Braces,
      run: go(`/terminal?run=${encodeURIComponent(s.command)}`),
    }));
    const all = [...base, ...hostItems, ...snipItems];
    if (!q.trim()) return all;
    const needle = q.toLowerCase();
    return all.filter(
      (i) =>
        i.label.toLowerCase().includes(needle) ||
        i.hint.toLowerCase().includes(needle) ||
        i.group.toLowerCase().includes(needle),
    );
  }, [q, hosts, snippets, router, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((v) => Math.min(v + 1, items.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((v) => Math.max(v - 1, 0));
      }
      if (e.key === "Enter" && items[idx]) {
        e.preventDefault();
        items[idx].run();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, idx, onClose]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className="fixed inset-0 z-[90] flex items-start justify-center bg-black/70 pt-[14vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden border border-line bg-void shadow-[0_0_60px_rgba(0,255,156,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <span className="text-neon">❯</span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="search hosts, snippets, actions…"
            className="h-12 flex-1 bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
          />
          <span className="border border-line px-1.5 py-0.5 text-[9px] text-zinc-600">
            ESC
          </span>
        </div>
        <div className="max-h-[46vh] overflow-y-auto p-1.5">
          {items.length === 0 && (
            <div className="px-4 py-8 text-center text-xs text-zinc-600">
              no signal matched &quot;{q}&quot;
            </div>
          )}
          {items.map((item, i) => {
            const showGroup = item.group !== lastGroup;
            lastGroup = item.group;
            return (
              <div key={item.id}>
                {showGroup && (
                  <div className="px-3 pt-3 pb-1 text-[9px] tracking-[0.3em] text-zinc-600 uppercase">
                    {item.group}
                  </div>
                )}
                <button
                  onClick={item.run}
                  onMouseEnter={() => setIdx(i)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2.5 text-left text-[12px] transition-colors",
                    i === idx ? "bg-neon/10 text-neon-hi" : "text-zinc-400",
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
                  <span className="flex-1 truncate">{item.label}</span>
                  <span className="truncate text-[10px] text-zinc-600">
                    {item.hint}
                  </span>
                  {i === idx && <CornerDownLeft className="h-3 w-3 text-neon" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[9px] tracking-[0.25em] text-zinc-600 uppercase">
          <span>↑↓ navigate · ↵ execute</span>
          <span className="text-neon/60">command grid v1</span>
        </div>
      </div>
    </div>
  );
}
