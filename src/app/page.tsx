"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  SquareTerminal,
  ScanLine,
  RadioTower,
  Waypoints,
  Braces,
  Zap,
  ArrowRight,
  ShieldCheck,
  Cpu,
  ChevronRight,
} from "lucide-react";
import MatrixRain from "@/components/matrix-rain";
import LiveTerminal from "@/components/landing/live-terminal";
import SettingsControls from "@/components/settings-controls";
import { usePrefs } from "@/lib/prefs";

/* ---------------- data ---------------- */

const FOOTPRINT = [
  { name: "JumpServer", mb: 2140, note: "10+ containers" },
  { name: "Guacamole", mb: 920, note: "JVM + DB" },
  { name: "Wetty", mb: 480, note: "node_modules" },
  { name: "NEOSSH", mb: 20, note: "single file", hero: true },
];

const MEMORY = [
  { name: "JumpServer", mb: 1536 },
  { name: "GateOne", mb: 210 },
  { name: "Wetty", mb: 145 },
  { name: "NEOSSH", mb: 30, hero: true },
];

const FEATURES = [
  {
    icon: SquareTerminal,
    title: "WebGL Terminal Fabric",
    desc: "GPU-rendered xterm surface pushing 60fps output. Zero-latency feel, Unicode 11, ligature-grade typography over a persistent PTY mesh.",
    idx: "01",
  },
  {
    icon: ScanLine,
    title: "Risk Engine + Keystroke Audit",
    desc: "Every line you type is classified in-flight. Destructive patterns are quarantined before they hit the wire — with a sealed forensic trail.",
    idx: "02",
  },
  {
    icon: RadioTower,
    title: "Command Broadcast",
    desc: "Fan a single command out across an entire host group in parallel. Watch every shell answer in one synchronized grid.",
    idx: "03",
  },
  {
    icon: Waypoints,
    title: "Tunnel Cartography",
    desc: "Local, remote and dynamic forwards drawn as a living network graph. Build bastion chains by dragging a line between nodes.",
    idx: "04",
  },
  {
    icon: Braces,
    title: "Snippet Armory",
    desc: "A war-chest of vetted one-liners, ranked by usage and flagged by blast radius. Fire any of them into a live terminal with one tap.",
    idx: "05",
  },
  {
    icon: Zap,
    title: "Zero-Footprint Core",
    desc: "No MySQL. No Redis. No ten-container ritual. One artifact, sub-second cold boot, invisible idle footprint.",
    idx: "06",
  },
];

const MARQUEE = [
  "WEBGL RENDERING",
  "KEYSTROKE FORENSICS",
  "RISK ENGINE",
  "COMMAND BROADCAST",
  "TUNNEL CARTOGRAPHY",
  "SFTP CONTRACT",
  "SESSION REPLAY",
  "ZERO DEPENDENCIES",
  "SSE TRANSPORT",
  "PTY MESH",
];

/* ---------------- small pieces ---------------- */

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="h-px w-8 bg-neon/60" />
      <span className="text-[11px] tracking-[0.35em] text-neon uppercase">
        {children}
      </span>
    </div>
  );
}

function BarRow({
  label,
  mb,
  max,
  note,
  hero,
}: {
  label: string;
  mb: number;
  max: number;
  note?: string;
  hero?: boolean;
}) {
  const pct = Math.max((Math.sqrt(mb) / Math.sqrt(max)) * 100, hero ? 2.5 : 6);
  return (
    <div className="group">
      <div className="mb-1.5 flex items-baseline justify-between text-xs">
        <span className={hero ? "text-neon-hi font-semibold" : "text-zinc-400"}>
          {label}
        </span>
        <span className={hero ? "text-neon" : "text-zinc-600"}>
          {mb >= 1000 ? `${(mb / 1024).toFixed(1)}GB` : `${mb}MB`}
          {note && <span className="ml-2 text-[10px] text-zinc-600">{note}</span>}
        </span>
      </div>
      <div className="h-[9px] w-full overflow-hidden rounded-sm bg-edge">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
          className={
            hero
              ? "h-full bg-gradient-to-r from-neon to-cyanx shadow-[0_0_16px_rgba(0,255,156,0.5)]"
              : "h-full bg-zinc-700 group-hover:bg-zinc-600"
          }
        />
      </div>
    </div>
  );
}

/* ---------------- page ---------------- */

export default function LandingPage() {
  const { t } = usePrefs();
  const tiltRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rX = useSpring(useTransform(my, [-0.5, 0.5], [4.5, -4.5]), {
    stiffness: 120,
    damping: 18,
  });
  const rY = useSpring(useTransform(mx, [-0.5, 0.5], [-5, 5]), {
    stiffness: 120,
    damping: 18,
  });

  const onTilt = (e: React.MouseEvent) => {
    const rect = tiltRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const resetTilt = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* ambient */}
      <MatrixRain className="matrix-canvas fixed inset-0 -z-20 h-full w-full" opacity={0.26} />
      <div className="hero-veil pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(2,6,4,0.2),rgba(2,6,4,0.88)_70%)]" />
      <div className="noise-overlay" />

      {/* nav */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-abyss/70 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center border border-neon/60 bg-neon/10 text-sm font-bold text-neon">
              ◢
            </span>
            <span className="font-display text-base font-bold tracking-[0.22em] text-zinc-100">
              NEO<span className="text-neon">SSH</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-[11px] tracking-[0.3em] text-zinc-400 md:flex">
            <a href="#compare" className="transition-colors hover:text-neon">
              {t("land.compare")}
            </a>
            <a href="#arsenal" className="transition-colors hover:text-neon">
              {t("land.arsenal")}
            </a>
            <a href="#risk" className="transition-colors hover:text-neon">
              {t("land.risk")}
            </a>
          </nav>
          <SettingsControls compact />
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 border border-neon/50 bg-neon/10 px-4 py-1.5 text-[11px] font-semibold tracking-[0.25em] text-neon transition-all hover:bg-neon hover:text-black"
          >
            {t("land.console")}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 pt-28 pb-16 lg:flex-row lg:items-center lg:gap-14">
        <div className="relative z-10 max-w-xl flex-1">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="mb-6 inline-flex items-center gap-2 border border-line bg-panel/80 px-3 py-1 text-[10px] tracking-[0.3em] text-neon/90">
              <span className="h-1.5 w-1.5 rounded-full bg-neon animate-pulse-dot" />
              {t("land.badge")}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.08 }}
            className="relative select-none"
          >
            <h1 className="relative font-display text-6xl leading-[0.95] font-bold tracking-tight text-zinc-50 sm:text-7xl lg:text-8xl">
              <span className="text-glow text-neon">NEO</span>
              <span className="text-zinc-500">{"//"}</span>
              {"SSH"}
              <span
                aria-hidden
                className="absolute inset-0 animate-glitch-a text-cyanx/70"
              >
                {"NEO//SSH"}
              </span>
              <span
                aria-hidden
                className="absolute inset-0 animate-glitch-b text-dangerx/60"
              >
                {"NEO//SSH"}
              </span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.18 }}
            className="mt-7 max-w-lg text-[15px] leading-relaxed text-zinc-400"
          >
            {t("land.tagline")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.28 }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <Link
              href="/terminal"
              className="group relative flex items-center gap-3 overflow-hidden border border-neon bg-neon px-7 py-3.5 font-display text-sm font-bold tracking-[0.3em] text-black transition-all hover:bg-neon-hi"
            >
              <span className="absolute inset-0 -translate-x-full bg-white/30 transition-transform duration-500 group-hover:translate-x-full" />
              {t("land.jackin")}
              <ChevronRight className="h-4 w-4" />
            </Link>
            <a
              href="#compare"
              className="border border-line px-7 py-3.5 font-display text-sm font-semibold tracking-[0.3em] text-zinc-300 transition-colors hover:border-neon/60 hover:text-neon"
            >
              {t("land.thecase")}
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.45 }}
            className="mt-12 grid max-w-md grid-cols-3 divide-x divide-line border border-line bg-panel/60"
          >
            {[
              ["20MB", t("land.statFile")],
              ["<30MB", t("land.statRss")],
              ["0.8s", t("land.statBoot")],
            ].map(([v, l]) => (
              <div key={l} className="px-4 py-3.5">
                <div className="font-display text-xl font-bold text-neon text-glow">
                  {v}
                </div>
                <div className="mt-0.5 text-[10px] tracking-[0.2em] text-zinc-500 uppercase">
                  {l}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* terminal */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 1, delay: 0.35 }}
          className="relative z-10 mt-14 flex-1 lg:mt-0"
          style={{ perspective: 1400 }}
        >
          <div
            ref={tiltRef}
            onMouseMove={onTilt}
            onMouseLeave={resetTilt}
            className="hud-corner"
          >
            <motion.div style={{ rotateX: rX, rotateY: rY }}>
              <LiveTerminal />
            </motion.div>
          </div>
          <div className="mt-4 flex items-center justify-between text-[10px] tracking-[0.25em] text-zinc-600 uppercase">
            <span>fig.01 — live fabric session</span>
            <span className="text-neon/60">recorded at pts/0</span>
          </div>
        </motion.div>
      </section>

      {/* marquee */}
      <div className="relative border-y border-line bg-panel/70 py-3.5">
        <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
          {[...MARQUEE, ...MARQUEE].map((item, i) => (
            <span
              key={i}
              className="flex items-center gap-10 text-[11px] tracking-[0.35em] text-zinc-500"
            >
              {item}
              <span className="text-neon/60">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* compare */}
      <section id="compare" className="relative mx-auto max-w-7xl px-5 py-28">
        <div className="grid gap-14 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div>
            <SectionTag>{t("land.cmpTag")}</SectionTag>
            <h2 className="font-display text-4xl leading-tight font-bold text-zinc-50 sm:text-5xl">
              {t("land.cmpTitleA")}
              <br />
              <span className="text-dangerx">{t("land.cmpTitleB")}</span>{" "}
              {t("land.cmpTitleC")}
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-zinc-400">
              {t("land.cmpP")}
            </p>
            <div className="mt-10 grid grid-cols-2 gap-4">
              {[
                { icon: ShieldCheck, k: "1", v: t("land.cmpDep") },
                { icon: Cpu, k: "0.1%", v: t("land.cmpCpu") },
              ].map(({ icon: Icon, k, v }) => (
                <div key={v} className="border border-line bg-panel/70 p-4">
                  <Icon className="mb-3 h-4 w-4 text-neon" />
                  <div className="font-display text-2xl font-bold text-zinc-50">
                    {k}
                  </div>
                  <div className="mt-1 text-[11px] text-zinc-500">{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-10 border border-line bg-panel/60 p-7 sm:p-9">
            <div>
              <div className="mb-5 flex items-center justify-between">
                <span className="text-[11px] tracking-[0.3em] text-zinc-400 uppercase">
                  Install footprint
                </span>
                <span className="text-[10px] text-zinc-600">√ scale</span>
              </div>
              <div className="space-y-5">
                {FOOTPRINT.map((r) => (
                  <BarRow
                    key={r.name}
                    label={r.name}
                    mb={r.mb}
                    max={FOOTPRINT[0].mb}
                    note={r.note}
                    hero={r.hero}
                  />
                ))}
              </div>
            </div>
            <div className="h-px bg-line" />
            <div>
              <div className="mb-5 text-[11px] tracking-[0.3em] text-zinc-400 uppercase">
                Resident memory
              </div>
              <div className="space-y-5">
                {MEMORY.map((r) => (
                  <BarRow
                    key={r.name}
                    label={r.name}
                    mb={r.mb}
                    max={MEMORY[0].mb}
                    hero={r.hero}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* arsenal */}
      <section id="arsenal" className="relative border-t border-line bg-void/60 py-28">
        <div className="mx-auto max-w-7xl px-5">
          <SectionTag>{t("land.arsTag")}</SectionTag>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="max-w-xl font-display text-4xl leading-tight font-bold text-zinc-50 sm:text-5xl">
              {t("land.arsTitle")}
              <span className="text-neon text-glow">{t("land.arsTitleHi")}</span>
            </h2>
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
              {t("land.arsP")}
            </p>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.idx}
                initial={{ opacity: 0, y: 26 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: (i % 3) * 0.09 }}
                className="group relative bg-panel p-7 transition-colors duration-300 hover:bg-lift"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-11 w-11 items-center justify-center border border-line bg-void text-neon transition-all duration-300 group-hover:border-neon/60 group-hover:shadow-[0_0_18px_rgba(0,255,156,0.25)]">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-xs text-zinc-600 transition-colors group-hover:text-neon/70">
                    {f.idx}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-lg font-bold text-zinc-100 transition-colors group-hover:text-neon-hi">
                  {f.title}
                </h3>
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-zinc-500">
                  {f.desc}
                </p>
                <span className="absolute right-0 bottom-0 h-px w-0 bg-neon transition-all duration-500 group-hover:w-full" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* risk engine */}
      <section id="risk" className="relative mx-auto max-w-7xl px-5 py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="hud-corner border border-line bg-void/90 p-6 box-glow sm:p-8">
              <div className="mb-5 flex items-center justify-between text-[10px] tracking-[0.3em] text-zinc-500 uppercase">
                <span>risk engine · in-flight classification</span>
                <span className="text-neon">armed</span>
              </div>
              <div className="space-y-4 text-[13px]">
                <div className="flex items-center justify-between gap-4 border-b border-line/60 pb-4">
                  <code className="truncate text-zinc-300">
                    <span className="text-cyanx">❯ </span>
                    find /var/log -name &apos;*.gz&apos; -mtime +30
                  </code>
                  <span className="shrink-0 border border-neon/40 bg-neon/10 px-2 py-0.5 text-[10px] tracking-[0.2em] text-neon">
                    SAFE
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 border-b border-line/60 pb-4">
                  <code className="truncate text-zinc-300">
                    <span className="text-cyanx">❯ </span>
                    sudo iptables -F INPUT
                  </code>
                  <span className="shrink-0 border border-amberx/40 bg-amberx/10 px-2 py-0.5 text-[10px] tracking-[0.2em] text-amberx">
                    WARN · logged
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <code className="truncate text-dangerx line-through decoration-dangerx/50">
                    <span className="text-cyanx no-underline">❯ </span>
                    rm -rf / --no-preserve-root
                  </code>
                  <span className="shrink-0 border border-dangerx/50 bg-dangerx/15 px-2 py-0.5 text-[10px] tracking-[0.2em] text-dangerx">
                    ⛔ QUARANTINED
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <SectionTag>{t("land.riskTag")}</SectionTag>
            <h2 className="font-display text-4xl leading-tight font-bold text-zinc-50 sm:text-5xl">
              {t("land.riskTitleA")}
              <br />
              <span className="text-amberx">{t("land.riskTitleB")}</span>
            </h2>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-zinc-400">
              {t("land.riskP")}
            </p>
            <Link
              href="/audit"
              className="group mt-8 inline-flex items-center gap-2 text-[11px] tracking-[0.3em] text-neon uppercase"
            >
              {t("land.riskLink")}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="relative overflow-hidden border-t border-line py-28">
        <div className="grid-bg absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,4,0.9)_75%)]" />
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <div className="mx-auto mb-7 w-max border border-neon/40 bg-neon/5 px-4 py-1.5 text-[10px] tracking-[0.35em] text-neon">
              $ curl -sSL neossh.dev | sh
            </div>
            <h2 className="font-display text-4xl leading-tight font-bold text-zinc-50 sm:text-6xl">
              {t("land.ctaTitle")}
              <span className="text-neon text-glow">{t("land.ctaTitleHi")}</span>
            </h2>
            <p className="mx-auto mt-5 max-w-md text-sm text-zinc-400">
              {t("land.ctaSub")}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/dashboard"
                className="group flex items-center gap-3 border border-neon bg-neon px-9 py-4 font-display text-sm font-bold tracking-[0.3em] text-black transition-all hover:bg-neon-hi"
              >
                {t("land.enterConsole")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/terminal"
                className="border border-line bg-abyss/60 px-9 py-4 font-display text-sm font-semibold tracking-[0.3em] text-zinc-300 transition-colors hover:border-cyanx/60 hover:text-cyanx"
              >
                {t("land.rawTerminal")}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-line bg-void/80">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-6 text-[10px] tracking-[0.25em] text-zinc-600 uppercase">
          <span>
            ◢ NEOSSH FABRIC — <span className="text-neon/70">v2.4.1</span>
          </span>
          <span>51.5072°N 0.1276°W · grid linked</span>
          <span>built for operators · kill your containers</span>
        </div>
      </footer>
    </div>
  );
}
