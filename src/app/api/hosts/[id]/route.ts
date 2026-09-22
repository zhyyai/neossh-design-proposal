import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { hosts } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });

  const patch: Partial<typeof hosts.$inferInsert> = {};
  if (body.name !== undefined) patch.name = String(body.name).slice(0, 60);
  if (body.hostname !== undefined) patch.hostname = String(body.hostname).slice(0, 120);
  if (body.port !== undefined) patch.port = Number(body.port) || 22;
  if (body.username !== undefined) patch.username = String(body.username).slice(0, 40);
  if (body.authType !== undefined) patch.authType = String(body.authType);
  if (body.groupName !== undefined) patch.groupName = String(body.groupName).slice(0, 40);
  if (body.tags !== undefined && Array.isArray(body.tags))
    patch.tags = body.tags.map((t: unknown) => String(t).slice(0, 24)).slice(0, 8);
  if (body.color !== undefined) patch.color = String(body.color).slice(0, 16);
  if (body.notes !== undefined) patch.notes = body.notes ? String(body.notes).slice(0, 500) : null;
  if (body.touch === true) patch.lastConnectedAt = new Date();

  const updated = await db.update(hosts).set(patch).where(eq(hosts.id, id)).returning();
  if (updated.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ host: updated[0] });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(hosts).where(eq(hosts.id, id));
  return NextResponse.json({ ok: true });
}
