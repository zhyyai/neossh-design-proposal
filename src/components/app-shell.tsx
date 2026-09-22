"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  SquareTerminal,
  Server,
  ScrollText,
  Braces,
  Waypoints,
  Command,
  LogOut,
  MonitorPlay,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePrefs, type DictKey } from "@/lib/prefs";
import CommandPalette from "@/components/command-palette";
import SettingsControls from "@/components/settings-controls";

const NAV: Array<{
  href: string;
  labelKey: DictKey;
  icon: React.ComponentType<{ className?: string }>;
  code: string;
}> = [
  { href: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, code: "D" },
  { href: "/terminal", labelKey: "nav.terminal", icon: SquareTerminal, code: "T" },
  { href: "/hosts", labelKey: "nav.hosts", icon: Server, code: "H" },
  { href: "/tunnels", labelKey: "nav.tunnels", icon: Waypoints, code: "N" },
  { href: "/snippets", labelKey: "nav.snippets", icon: Braces, code: "S" },
  { href: "/audit", labelKey: "nav.audit", icon: ScrollText, code: "A" },
  { href: "/replays", labelKey: "nav.replays", icon: MonitorPlay, code: "R" },
];

const TITLE_KEYS: Record<string, DictKey> = {
  "/dashboard": "title.dashboard",
  "/terminal": "title.terminal",
  "/hosts": "title.hosts",
  "/tunnels": "title.tunnels",
  "/snippets": "title.snippets",
  "/audit": "title.audit",
  "/replays": "title.replays",
};

function Clock() {
  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () =>
      setNow(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="hidden text-[11px] tracking-[0.2em] text-zinc-500 tabular-nums sm:inline">
      {now}
    </span>
  );
}

function LiveCount() {
  const { t } = usePrefs();
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/terminal", { cache: "no-store" });
        const json = await res.json();
        if (alive)
          setCount(
            (json.sessions ?? []).filter(
              (s: { status: string }) => s.status === "active",
            ).length,
          );
      } catch {
        /* noop */
      }
    };
    poll();
    const t = setInterval(poll, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);
  return (
    <span className="flex items-center gap-2 border border-line bg-panel px-2.5 py-1 text-[10px] tracking-[0.2em] text-zinc-400">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          count > 0 ? "bg-neon animate-pulse-dot" : "bg-zinc-600",
        )}
      />
      {count} {t("shell.ptyLive")}
    </span>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = usePrefs();
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const title = TITLE_KEYS[pathname] ? t(TITLE_KEYS[pathname]) : t("shell.fabric");

  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      /* noop */
    }
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-abyss">
      {/* sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[218px] flex-col border-r border-line bg-void/90 backdrop-blur">
        <Link
          href="/"
          className="flex h-14 items-center gap-2.5 border-b border-line px-5"
        >
          <span className="flex h-7 w-7 items-center justify-center border border-neon/60 bg-neon/10 text-sm font-bold text-neon">
            ◢
          </span>
          <span className="font-display text-sm font-bold tracking-[0.22em] text-zinc-100">
            NEO<span className="text-neon">SSH</span>
          </span>
        </Link>

        <div className="px-5 pt-5 pb-2 text-[9px] tracking-[0.35em] text-zinc-600 uppercase">
          {t("shell.modules")}
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {NAV.map(({ href, labelKey, icon: Icon, code }) => {
            const label = t(labelKey);
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group relative flex items-center gap-3 px-3 py-2.5 text-[12px] transition-all",
                  active
                    ? "bg-neon/10 text-neon-hi"
                    : "text-zinc-500 hover:bg-lift hover:text-zinc-200",
                )}
              >
                <span
                  className={cn(
                    "absolute top-1/2 left-0 h-5 w-[2px] -translate-y-1/2 bg-neon transition-all",
                    active ? "opacity-100 shadow-[0_0_8px_rgba(0,255,156,0.8)]" : "opacity-0",
                  )}
                />
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{label}</span>
                <span
                  className={cn(
                    "text-[9px] tracking-widest",
                    active ? "text-neon/70" : "text-zinc-700",
                  )}
                >
                  {code}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <button
            onClick={() => setPaletteOpen(true)}
            className="flex w-full items-center gap-3 border border-line bg-panel px-3 py-2.5 text-[11px] text-zinc-500 transition-colors hover:border-neon/40 hover:text-zinc-200"
          >
            <Command className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">{t("shell.grid")}</span>
            <span className="text-[9px] text-zinc-600">⌘K</span>
          </button>
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-3 px-3 py-2 text-[11px] text-zinc-600 transition-colors hover:text-dangerx"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("shell.exit")}
          </button>
          <div className="mt-2 px-3 text-[9px] tracking-[0.3em] text-zinc-700">
            {t("shell.node")} 7F3A · v2.4.1
          </div>
        </div>
      </aside>

      {/* main */}
      <div className="ml-[218px] flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-abyss/80 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3 text-[11px] tracking-[0.3em] uppercase">
            <span className="text-zinc-600">{t("shell.fabric")}</span>
            <span className="text-zinc-700">/</span>
            <span className="text-neon">{title}</span>
          </div>
          <div className="flex items-center gap-4">
            <Clock />
            <SettingsControls compact />
            <LiveCount />
          </div>
        </header>
        <main className="grid-bg relative flex-1">{children}</main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
