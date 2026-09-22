"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  X,
  RadioTower,
  Type,
  Braces,
  Server,
  ShieldCheck,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronLeft,
  FolderOpen,
} from "lucide-react";
import XTermView, {
  killSession,
  sendInput,
  type SessionConfig,
} from "@/components/terminal/xterm-view";
import FileExplorer from "@/components/terminal/file-explorer";
import { TERMINAL_THEMES, type ThemeName } from "@/components/terminal/terminal-themes";
import SettingsControls from "@/components/settings-controls";
import type { Host, Snippet } from "@/db/schema";
import { cn } from "@/lib/utils";
import { fontStackFor, usePrefs } from "@/lib/prefs";

interface Tab {
  viewId: string;
  config: SessionConfig;
  sessionId: string | null;
  status: "connecting" | "live" | "exited";
  cols: number;
  rows: number;
  color: string;
}

let tabCounter = 0;
function nextViewId() {
  tabCounter += 1;
  return `v${Date.now().toString(36)}-${tabCounter}`;
}

function sandingLabel(name: string) {
  return name.length > 18 ? `${name.slice(0, 18)}…` : name;
}

export default function TerminalWorkspace() {
  const params = useSearchParams();
  const { t, font } = usePrefs();
  const fontStack = fontStackFor(font);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [broadcast, setBroadcast] = useState(false);
  const [themeName, setThemeName] = useState<ThemeName>("matrix");
  const [fontSize, setFontSize] = useState(13);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(false);
  // workspace clock — ticked asynchronously from mount
  const [clock, setClock] = useState<{ boot: number; now: number } | null>(null);

  const tabsRef = useRef<Tab[]>(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);
  const broadcastRef = useRef(broadcast);
  useEffect(() => {
    broadcastRef.current = broadcast;
  }, [broadcast]);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock((cur) => {
        const n = Date.now();
        return { boot: cur?.boot ?? n, now: n };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const initRef = useRef(false);

  /* tab factory */
  const openTab = useCallback((config: SessionConfig, color = "#00ff9c") => {
    const viewId = nextViewId();
    setTabs((prev) => [
      ...prev,
      { viewId, config, sessionId: null, status: "connecting", cols: 0, rows: 0, color },
    ]);
    setActiveId(viewId);
    return viewId;
  }, []);

  const openSandbox = useCallback(
    (runCmd?: string) =>
      openTab(
        {
          label: `sandbox-${tabsRef.current.filter((t) => t.config.mode === "sandbox").length + 1}`,
          target: "127.0.0.1",
          username: "operator",
          port: 22,
          mode: "sandbox",
          runCmd,
        },
        "#3ee6ff",
      ),
    [openTab],
  );

  const connectHost = useCallback(
    (h: Host, runCmd?: string) => {
      fetch(`/api/hosts/${h.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ touch: true }),
      }).catch(() => undefined);
      openTab(
        {
          label: h.name,
          target: h.hostname,
          username: h.username,
          port: h.port,
          mode: "ssh",
          runCmd,
        },
        h.color,
      );
    },
    [openTab],
  );

  /* remote data + one-time deep-link boot (async callbacks only) */
  useEffect(() => {
    fetch("/api/hosts")
      .then((r) => r.json())
      .then((j) => {
        const hostList: Host[] = j.hosts ?? [];
        setHosts(hostList);
        if (initRef.current) return;
        initRef.current = true;
        const hostId = params.get("host");
        const runCmd = params.get("run");
        if (hostId) {
          const h = hostList.find((x) => x.id === hostId);
          if (h) {
            connectHost(h, runCmd ?? undefined);
            return;
          }
        }
        openSandbox(runCmd ?? undefined);
      })
      .catch(() => {
        if (!initRef.current) {
          initRef.current = true;
          openSandbox();
        }
      });
    fetch("/api/snippets")
      .then((r) => r.json())
      .then((j) => setSnippets(j.snippets ?? []))
      .catch(() => undefined);
  }, [params, connectHost, openSandbox]);

  const closeTab = useCallback(
    (viewId: string) => {
      setTabs((prev) => {
        const idx = prev.findIndex((t) => t.viewId === viewId);
        const next = prev.filter((t) => t.viewId !== viewId);
        if (next.length === 0) {
          queueMicrotask(() => openSandbox());
        }
        setActiveId((current) => {
          if (current !== viewId) return current;
          const fallback = next[Math.max(0, idx - 1)];
          return fallback?.viewId ?? null;
        });
        return next;
      });
    },
    [openSandbox],
  );

  /* input routing — broadcast or single-tab, resolved per keystroke */
  const routeUserInput = useCallback((viewId: string, data: string) => {
    if (broadcastRef.current) {
      for (const t of tabsRef.current) {
        if (t.sessionId && t.status === "live") sendInput(t.sessionId, data);
      }
      return;
    }
    const tab = tabsRef.current.find((t) => t.viewId === viewId);
    if (tab?.sessionId) sendInput(tab.sessionId, data);
  }, []);

  const makeInputHandler = useCallback(
    (viewId: string) => (data: string) => routeUserInput(viewId, data),
    [routeUserInput],
  );

  /* view callbacks */
  const onSessionReady = useCallback((viewId: string, sessionId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.viewId === viewId ? { ...t, sessionId, status: "live" } : t)),
    );
  }, []);
  const onExit = useCallback((viewId: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.viewId === viewId ? { ...t, status: "exited" } : t)),
    );
  }, []);
  const onGeometry = useCallback((viewId: string, cols: number, rows: number) => {
    setTabs((prev) =>
      prev.map((t) => (t.viewId === viewId ? { ...t, cols, rows } : t)),
    );
  }, []);

  /* fire snippet into active session */
  const fireSnippet = (s: Snippet) => {
    const active = tabsRef.current.find((t) => t.viewId === activeId);
    if (!active?.sessionId) return;
    fetch(`/api/snippets/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inc: true }),
    }).catch(() => undefined);
    sendInput(active.sessionId, s.command);
  };

  /* kill everything on tab close */
  useEffect(() => {
    const onHide = () => {
      for (const t of tabsRef.current) if (t.sessionId) killSession(t.sessionId);
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  const activeTab = useMemo(
    () => tabs.find((t) => t.viewId === activeId) ?? null,
    [tabs, activeId],
  );
  const liveCount = tabs.filter((t) => t.status === "live").length;
  const uptime = clock ? Math.max(0, Math.floor((clock.now - clock.boot) / 1000)) : 0;
  const up = `${String(Math.floor(uptime / 60)).padStart(2, "0")}:${String(uptime % 60).padStart(2, "0")}`;

  return (
    <div className="scanlines relative flex h-screen flex-col overflow-hidden bg-abyss">
      {/* top bar */}
      <header className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-line bg-void/95 px-3">
        <Link
          href="/dashboard"
          className="flex h-8 w-8 shrink-0 items-center justify-center border border-line text-zinc-500 transition-colors hover:border-neon/50 hover:text-neon"
          title="back to console"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="mr-1 hidden shrink-0 items-center gap-2 sm:flex">
          <span className="flex h-6 w-6 items-center justify-center border border-neon/60 bg-neon/10 text-[10px] font-bold text-neon">
            ◢
          </span>
        </span>

        {/* tabs */}
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {tabs.map((t) => (
            <div
              key={t.viewId}
              role="button"
              tabIndex={0}
              onClick={() => setActiveId(t.viewId)}
              onKeyDown={(e) => e.key === "Enter" && setActiveId(t.viewId)}
              className={cn(
                "group flex h-8 min-w-0 cursor-pointer items-center gap-2 border px-3 text-[11px] transition-all",
                t.viewId === activeId
                  ? "border-neon/50 bg-neon/10 text-neon-hi"
                  : "border-line bg-panel text-zinc-500 hover:text-zinc-300",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  t.status === "live" && "animate-pulse-dot",
                )}
                style={{
                  background: t.status === "exited" ? "#4d5c55" : t.color,
                  boxShadow: t.status === "exited" ? "none" : `0 0 6px ${t.color}`,
                }}
              />
              <span className="max-w-32 truncate">{sandingLabel(t.config.label)}</span>
              {t.status === "exited" && (
                <span className="text-[9px] text-zinc-600">[dead]</span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.viewId);
                }}
                className="text-zinc-600 opacity-0 transition-all group-hover:opacity-100 hover:text-dangerx"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            onClick={() => openSandbox()}
            className="flex h-8 w-8 shrink-0 items-center justify-center border border-dashed border-line text-zinc-500 transition-colors hover:border-neon/60 hover:text-neon"
            title="new sandbox shell"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* controls */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={() => setBroadcast((v) => !v)}
            className={cn(
              "flex h-8 items-center gap-1.5 border px-2.5 text-[10px] font-bold tracking-widest uppercase transition-all",
              broadcast
                ? "border-amberx/60 bg-amberx/15 text-amberx shadow-[0_0_14px_rgba(255,180,84,0.25)]"
                : "border-line text-zinc-500 hover:text-zinc-300",
            )}
            title="broadcast input to every live session"
          >
            <RadioTower className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">
                {broadcast ? t("term.castAll") : t("term.castOne")}
              </span>
          </button>
          <div className="hidden h-8 items-center gap-1 border border-line px-1 md:flex">
            <Type className="ml-1 h-3.5 w-3.5 text-zinc-600" />
            <button
              onClick={() => setFontSize((v) => Math.max(10, v - 1))}
              className="h-6 w-6 text-zinc-500 hover:text-neon"
            >
              −
            </button>
            <span className="w-6 text-center text-[11px] text-zinc-400 tabular-nums">
              {fontSize}
            </span>
            <button
              onClick={() => setFontSize((v) => Math.min(20, v + 1))}
              className="h-6 w-6 text-zinc-500 hover:text-neon"
            >
              +
            </button>
          </div>
          <select
            value={themeName}
            onChange={(e) => setThemeName(e.target.value as ThemeName)}
            className="h-8 border border-line bg-panel px-2 text-[10px] tracking-wider text-zinc-400 uppercase outline-none hover:text-neon"
          >
            {Object.entries(TERMINAL_THEMES).map(([key, v]) => (
              <option key={key} value={key}>
                {v.label}
              </option>
            ))}
          </select>
          <SettingsControls compact />
          <button
            onClick={() => setFilesOpen((v) => !v)}
            className={cn(
              "flex h-8 items-center gap-1.5 border px-2.5 text-[10px] font-bold tracking-widest uppercase transition-all",
              filesOpen
                ? "border-cyanx/60 bg-cyanx/15 text-cyanx"
                : "border-line text-zinc-500 hover:text-zinc-300",
            )}
            title="browse sandbox filesystem"
          >
            <FolderOpen className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">{t("term.files")}</span>
          </button>
          <button
            onClick={() => setLeftOpen((v) => !v)}
            className="hidden h-8 w-8 items-center justify-center border border-line text-zinc-500 hover:text-neon md:flex"
          >
            {leftOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setRightOpen((v) => !v)}
            className="hidden h-8 w-8 items-center justify-center border border-line text-zinc-500 hover:text-neon lg:flex"
          >
            {rightOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
          </button>
        </div>
      </header>

      {/* body */}
      <div className="relative z-10 flex min-h-0 flex-1">
        {/* left rail — hosts */}
        {leftOpen && (
          <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-void/90 md:flex">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
              <Server className="h-3.5 w-3.5 text-neon" /> {t("term.targets")}
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {hosts.map((h) => {
                const open = tabs.some(
                  (t) => t.config.target === h.hostname && t.status !== "exited",
                );
                return (
                  <button
                    key={h.id}
                    onClick={() => connectHost(h)}
                    className="group flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-lift"
                  >
                    <span
                      className={cn("h-1.5 w-1.5 shrink-0 rounded-full", open && "animate-pulse-dot")}
                      style={{ background: h.color, boxShadow: `0 0 6px ${h.color}` }}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11px] text-zinc-200 group-hover:text-zinc-50">
                        {h.name}
                      </span>
                      <span className="block truncate text-[9px] text-zinc-600">
                        {h.username}@{h.hostname}:{h.port}
                      </span>
                    </span>
                    {open && <span className="text-[8px] tracking-widest text-neon uppercase">on</span>}
                  </button>
                );
              })}
              {hosts.length === 0 && (
                <div className="px-3 py-6 text-center text-[10px] text-zinc-600">
                  scanning mesh…
                </div>
              )}
            </div>
            <button
              onClick={() => openSandbox()}
              className="m-2 flex items-center justify-center gap-2 border border-dashed border-line px-3 py-2.5 text-[10px] tracking-[0.25em] text-zinc-500 uppercase transition-colors hover:border-cyanx/60 hover:text-cyanx"
            >
              <Zap className="h-3 w-3" /> {t("term.sandbox")}
            </button>
          </aside>
        )}

        {/* terminal stack */}
        <main className="relative min-w-0 flex-1 bg-[#020403]">
          {tabs.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-zinc-600">
              <div className="h-10 w-10 animate-pulse border border-neon/40 bg-neon/10" />
              <span className="text-[11px] tracking-[0.3em] uppercase">
                {t("term.spinning")}
              </span>
            </div>
          )}
          {tabs.map((t) => (
            <div key={t.viewId} className="absolute inset-0">
              <XTermView
                viewId={t.viewId}
                config={t.config}
                themeName={themeName}
                fontSize={fontSize}
                fontStack={fontStack}
                active={t.viewId === activeId}
                onSessionReady={onSessionReady}
                onExit={() => onExit(t.viewId)}
                onUserInput={makeInputHandler(t.viewId)}
                onGeometry={onGeometry}
              />
            </div>
          ))}
          {broadcast && tabs.length > 1 && (
            <div className="absolute top-2 left-1/2 z-30 -translate-x-1/2 border border-amberx/50 bg-black/80 px-3 py-1 text-[9px] tracking-[0.3em] text-amberx uppercase backdrop-blur">
              {t("term.armed", { n: liveCount })}
            </div>
          )}
          {filesOpen && (
            <div className="absolute inset-y-0 right-0 z-40 w-[380px] max-w-[92vw] shadow-[-20px_0_60px_rgba(0,0,0,0.6)]">
              <FileExplorer onClose={() => setFilesOpen(false)} />
            </div>
          )}
        </main>

        {/* right rail — snippets */}
        {rightOpen && (
          <aside className="hidden w-64 shrink-0 flex-col border-l border-line bg-void/90 lg:flex">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
              <Braces className="h-3.5 w-3.5 text-cyanx" /> {t("term.armory")}
            </div>
            <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
              {snippets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => fireSnippet(s)}
                  className="group w-full border border-transparent px-2.5 py-2 text-left transition-colors hover:border-line hover:bg-lift"
                  title={s.command}
                >
                  <span className="flex items-center gap-1.5 text-[11px] text-zinc-200">
                    {s.danger && <span className="text-[8px] text-dangerx">▲</span>}
                    <span className="truncate group-hover:text-neon-hi">{s.title}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[9.5px] text-cyanx/70">
                    {s.command}
                  </span>
                </button>
              ))}
            </div>
            <div className="border-t border-line px-4 py-2.5 text-[9px] leading-relaxed text-zinc-600">
              {t("term.armoryHint")}
            </div>
          </aside>
        )}
      </div>

      {/* status bar */}
      <footer className="relative z-20 flex h-7 shrink-0 items-center justify-between gap-3 border-t border-line bg-void/95 px-3 text-[9px] tracking-[0.2em] text-zinc-600 uppercase">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex items-center gap-1.5 text-neon">
            <ShieldCheck className="h-3 w-3" /> {t("term.riskArmed")}
          </span>
          <span className="hidden md:inline">chacha20-poly1305 · curve25519</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline">
            {activeTab ? `${activeTab.cols}×${activeTab.rows}` : "--×--"} · utf-8
          </span>
          <span className="tabular-nums">
            {t("term.uptime")} {up}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("h-1.5 w-1.5 rounded-full", liveCount > 0 ? "bg-neon animate-pulse-dot" : "bg-zinc-600")} />
            {liveCount} {t("term.live")}
          </span>
        </div>
      </footer>
    </div>
  );
}
