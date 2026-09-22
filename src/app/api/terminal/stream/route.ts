import { NextRequest } from "next/server";
import { ptyManager } from "@/lib/pty-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) {
    return new Response("missing session id", { status: 400 });
  }

  const encoder = new TextEncoder();
  let detach: (() => void) | null = null;
  let ping: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const enqueue = (payload: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          closed = true;
        }
      };

      detach = ptyManager.attach(
        id,
        (chunk) => {
          const b64 = Buffer.from(chunk, "utf8").toString("base64");
          enqueue(`data: ${b64}\n\n`);
        },
        (code) => {
          enqueue(`event: exit\ndata: ${code}\n\n`);
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              /* noop */
            }
          }
          if (ping) clearInterval(ping);
        },
      );

      if (!detach) {
        enqueue(`event: error\ndata: unknown-session\n\n`);
        controller.close();
        return;
      }

      ping = setInterval(() => enqueue(`: ping ${Date.now()}\n\n`), 15000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        if (ping) clearInterval(ping);
        detach?.();
        try {
          controller.close();
        } catch {
          /* noop */
        }
      });
    },
    cancel() {
      if (ping) clearInterval(ping);
      detach?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
