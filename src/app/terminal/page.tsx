import { Suspense } from "react";
import TerminalWorkspace from "@/components/terminal/terminal-workspace";

export const dynamic = "force-dynamic";

export default function TerminalPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-abyss">
          <span className="text-[11px] tracking-[0.35em] text-neon uppercase">
            initializing fabric…
          </span>
        </div>
      }
    >
      <TerminalWorkspace />
    </Suspense>
  );
}
