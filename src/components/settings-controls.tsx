"use client";

import { useEffect, useRef, useState } from "react";
import { Sun, Moon, Type, Check } from "lucide-react";
import { FONT_OPTIONS, usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

export default function SettingsControls({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { lang, mode, font, toggleLang, toggleMode, setFont, t } = usePrefs();
  const [fontOpen, setFontOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fontOpen) return;
    const onDown = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setFontOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [fontOpen]);

  const btnCls = cn(
    "flex h-8 items-center justify-center border border-line text-zinc-500 transition-all hover:border-neon/50 hover:text-neon",
    compact ? "w-8" : "px-2.5",
  );

  return (
    <div className="flex items-center gap-1.5">
      {/* language */}
      <button
        onClick={toggleLang}
        className={cn(btnCls, "text-[11px] font-bold tracking-wider")}
        title={t("ctl.lang")}
      >
        {lang === "en" ? "中" : "EN"}
      </button>
      {/* mode */}
      <button
        onClick={toggleMode}
        className={btnCls}
        title={t("ctl.mode")}
      >
        {mode === "dark" ? (
          <Sun className="h-3.5 w-3.5" />
        ) : (
          <Moon className="h-3.5 w-3.5" />
        )}
      </button>
      {/* font */}
      <div className="relative" ref={popRef}>
        <button
          onClick={() => setFontOpen((v) => !v)}
          className={cn(
            btnCls,
            fontOpen && "border-neon/60 text-neon",
          )}
          title={t("ctl.font")}
        >
          <Type className="h-3.5 w-3.5" />
          {!compact && (
            <span className="ml-1.5 max-w-20 truncate text-[10px]">
              {FONT_OPTIONS.find((f) => f.id === font)?.label}
            </span>
          )}
        </button>
        {fontOpen && (
          <div className="absolute right-0 top-9 z-[95] w-56 border border-line bg-void shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
            <div className="border-b border-line px-3 py-2 text-[9px] tracking-[0.3em] text-zinc-500 uppercase">
              {t("ctl.font")}
            </div>
            {FONT_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => {
                  setFont(opt.id);
                  setFontOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-lift",
                  font === opt.id ? "bg-neon/10" : "",
                )}
              >
                <span
                  className="w-8 shrink-0 text-[13px] text-cyanx"
                  style={{ fontFamily: opt.stack }}
                >
                  Ag
                </span>
                <span
                  className="flex-1 text-[11.5px] text-zinc-200"
                  style={{ fontFamily: opt.stack }}
                >
                  {opt.label}
                </span>
                {font === opt.id && <Check className="h-3.5 w-3.5 text-neon" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
