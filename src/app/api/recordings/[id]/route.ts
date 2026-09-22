import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { recordings } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const rows = await db.select().from(recordings).where(eq(recordings.id, id));
  const rec = rows[0];
  if (!rec) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    recording: { ...rec, createdAt: rec.createdAt.toISOString() },
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(recordings).where(eq(recordings.id, id));
  return NextResponse.json({ ok: true });
}
