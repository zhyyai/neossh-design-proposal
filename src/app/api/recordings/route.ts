import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { recordings } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: recordings.id,
      sessionLabel: recordings.sessionLabel,
      target: recordings.target,
      mode: recordings.mode,
      bytes: recordings.bytes,
      durationMs: recordings.durationMs,
      createdAt: recordings.createdAt,
    })
    .from(recordings)
    .orderBy(desc(recordings.createdAt))
    .limit(80);
  return NextResponse.json({
    recordings: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
  });
}
