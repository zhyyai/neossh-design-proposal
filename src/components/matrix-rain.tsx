"use client";

import { useEffect, useRef } from "react";

const GLYPHS =
  "アィウェオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEFZ$#+=<>/\\|ﾊﾋﾌﾍﾎ".split(
    "",
  );

export default function MatrixRain({
  className = "",
  opacity = 0.55,
  fontSize = 15,
  speed = 1,
  color = "#00ff9c",
}: {
  className?: string;
  opacity?: number;
  fontSize?: number;
  speed?: number;
  color?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let last = 0;
    let cols = 0;
    let drops: number[] = [];
    let speeds: number[] = [];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(rect.width / fontSize);
      drops = Array.from({ length: cols }, () =>
        Math.floor(Math.random() * (rect.height / fontSize)),
      );
      speeds = Array.from({ length: cols }, () => 0.55 + Math.random() * 0.9);
      ctx.fillStyle = "#020604";
      ctx.fillRect(0, 0, rect.width, rect.height);
    };

    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (document.hidden) return;
      if (t - last < 33 / speed) return;
      last = t;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      ctx.fillStyle = "rgba(2, 6, 4, 0.14)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < cols; i++) {
        const ch = GLYPHS[(Math.random() * GLYPHS.length) | 0];
        const y = drops[i] * fontSize;
        const head = Math.random() > 0.975;
        ctx.fillStyle = head ? "#b8ffe2" : color;
        ctx.globalAlpha = head ? 0.95 : 0.62;
        ctx.fillText(ch, i * fontSize, y);
        if (y > h && Math.random() > 0.986) drops[i] = 0;
        drops[i] += speeds[i];
      }
      ctx.globalAlpha = 1;
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [fontSize, speed, color]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}
