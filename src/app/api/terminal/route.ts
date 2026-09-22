import { NextRequest, NextResponse } from "next/server";
import { ptyManager, type RecordingSnapshot } from "@/lib/pty-manager";
import { db } from "@/db";
import { commandLogs, recordings, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* archive the raw take when a channel goes dark */
async function persistSnapshot(snap: RecordingSnapshot | null) {
  if (!snap || snap.entries.length === 0) return;
  if (!snap.hadInput || snap.durationMs < 1500) return; // skip untouched shells
  try {
    await db.insert(recordings).values({
      sessionLabel: snap.label,
      target: snap.target,
      mode: snap.mode,
      data: JSON.stringify(snap.entries),
      bytes: snap.bytes,
      durationMs: snap.durationMs,
    });
  } catch (err) {
    console.error("[neossh] recording persist failed", err);
  }
}

export async function GET() {
  return NextResponse.json({ sessions: ptyManager.list() });
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const label = String(body.label ?? "sandbox").slice(0, 60);
  const target = String(body.target ?? "localhost").slice(0, 120);
  const username = String(body.username ?? "root").slice(0, 40);
  const port = Number.isFinite(Number(body.port)) ? Number(body.port) : 22;
  const cols = Number(body.cols) || 120;
  const rows = Number(body.rows) || 32;
  const mode = body.mode === "sandbox" ? "sandbox" : "ssh";

  let auditId: string | null = null;
  try {
    const inserted = await db
      .insert(sessions)
      .values({ hostLabel: label, target, mode, status: "active" })
      .returning({ id: sessions.id });
    auditId = inserted[0]?.id ?? null;
  } catch (err) {
    console.error("[neossh] audit insert failed", err);
  }

  const auditRef = auditId;
  let sid: string | null = null;
  const meta = await ptyManager.create({
    label,
    target,
    username,
    port,
    mode,
    cols,
    rows,
    onCommand: ({ command, risk }) => {
      db.insert(commandLogs)
        .values({
          sessionId: auditRef ?? target,
          hostLabel: label,
          command,
          risk,
        })
        .catch(() => undefined);
    },
    onExit: (code) => {
      void persistSnapshot(sid ? ptyManager.snapshot(sid) : null);
      if (!auditRef) return;
      db.update(sessions)
        .set({ status: "closed", endedAt: new Date(), exitCode: code })
        .where(eq(sessions.id, auditRef))
        .catch(() => undefined);
    },
  });
  sid = meta.id;

  return NextResponse.json({ session: meta, auditId });
}

export async function DELETE(req: NextRequest) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  const snap = ptyManager.snapshot(id);
  const ok = ptyManager.kill(id);
  await persistSnapshot(snap);
  return NextResponse.json({ ok });
}
