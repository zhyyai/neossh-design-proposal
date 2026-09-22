"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, ArrowRight, AlertTriangle, KeyRound } from "lucide-react";
import MatrixRain from "@/components/matrix-rain";
import SettingsControls from "@/components/settings-controls";
import KolaLogo from "@/components/kola-logo";
import { usePrefs } from "@/lib/prefs";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = usePrefs();

  const nextUrl = searchParams.get("next") || "/dashboard";

  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || t("auth.error"));
        setLoading(false);
        return;
      }

      router.push(nextUrl);
      router.refresh();
    } catch {
      setError(t("auth.error"));
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4">
      {/* Top right settings */}
      <div className="absolute top-5 right-6 z-20">
        <SettingsControls compact />
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md border border-line bg-void/95 p-8 shadow-[0_0_60px_rgba(0,0,0,0.8)] backdrop-blur-md">
        {/* Terminal Header Bar */}
        <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center border border-neon/60 bg-neon/10 p-0.5 transition-all group-hover:border-neon group-hover:shadow-[0_0_12px_rgba(0,255,156,0.4)]">
              <KolaLogo className="h-full w-full" />
            </div>
            <span className="font-display text-sm font-bold tracking-[0.22em] text-zinc-100">
              NEO<span className="text-neon">SSH</span>
            </span>
          </Link>
          <span className="flex items-center gap-1.5 text-[10px] tracking-widest text-zinc-500 uppercase">
            <ShieldCheck className="h-3.5 w-3.5 text-neon" />
            GATEWAY 01
          </span>
        </div>

        {/* Title and Badge */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 border border-neon/30 bg-neon/5 px-2.5 py-1 text-[10px] tracking-[0.25em] text-neon uppercase">
            <Lock className="h-3 w-3" />
            {t("auth.subtitle")}
          </div>
          <h1 className="mt-3 font-display text-xl font-bold tracking-[0.15em] text-zinc-100">
            {t("auth.title")}
          </h1>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-5 flex items-center gap-2.5 border border-dangerx/50 bg-dangerx/10 p-3 text-[11px] text-dangerx tracking-wide">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-[10px] font-semibold tracking-[0.2em] text-zinc-400 uppercase">
              {t("auth.keyLabel")}
            </label>
            <div className="relative">
              <KeyRound className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={t("auth.keyPlaceholder")}
                autoFocus
                disabled={loading}
                className="w-full border border-line bg-panel py-2.5 pr-4 pl-9 text-[13px] font-mono text-zinc-100 placeholder:text-zinc-600 focus:border-neon focus:ring-1 focus:ring-neon focus:outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !key.trim()}
            className="group flex w-full items-center justify-center gap-2 border border-neon bg-neon/10 py-3 text-[12px] font-bold tracking-[0.25em] text-neon uppercase transition-all hover:bg-neon hover:text-void disabled:cursor-not-allowed disabled:opacity-40"
          >
            <span>{loading ? t("auth.authenticating") : t("auth.authenticate")}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </button>
        </form>

        {/* Card Footer */}
        <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4 text-[10px] text-zinc-500">
          <Link href="/" className="transition-colors hover:text-neon">
            ← {t("auth.back")}
          </Link>
          <span className="font-mono text-zinc-600">SECP256 · SHA-256</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen bg-abyss">
      {/* Background Matrix Rain */}
      <MatrixRain opacity={0.35} />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
