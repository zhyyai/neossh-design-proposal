import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tunnels } from "@/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (body.status !== undefined && ["active", "stopped"].includes(body.status))
    patch.status = body.status;
  if (body.name !== undefined) patch.name = String(body.name).slice(0, 60);
  const updated = await db.update(tunnels).set(patch).where(eq(tunnels.id, id)).returning();
  if (updated.length === 0) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ tunnel: updated[0] });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  await db.delete(tunnels).where(eq(tunnels.id, id));
  return NextResponse.json({ ok: true });
}
