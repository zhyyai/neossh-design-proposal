import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { snippets } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = String(body.title).slice(0, 80);
  if (body.command !== undefined) patch.command = String(body.command).slice(0, 1000);
  if (body.description !== undefined)
    patch.description = body.description ? String(body.description).slice(0, 300) : null;
  if (body.category !== undefined) patch.category = String(body.category).slice(0, 40);
  if (body.danger !== undefined) patch.danger = Boolean(body.danger);

  let updated;
  if (body.inc === true) {
    updated = await db
      .update(snippets)
      .set({ usageCount: sql`${snippets.usageCount} + 1` })
      .where(eq(snippets.id, id))
      .returning();
  } else {
    updated = await db.update(snippets).set(patch).where(eq(snippets.id, id)).returning();
  }
  if (updated.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ snippet: updated[0] });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(snippets).where(eq(snippets.id, id));
  return NextResponse.json({ ok: true });
}
