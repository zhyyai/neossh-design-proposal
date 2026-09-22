import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { tunnels } from "@/db/schema";
import { ensureSeed } from "@/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const rows = await db.select().from(tunnels).orderBy(desc(tunnels.createdAt));
  return NextResponse.json({ tunnels: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const inserted = await db
    .insert(tunnels)
    .values({
      name: String(body.name).slice(0, 60),
      type: ["local", "remote", "dynamic"].includes(body.type) ? body.type : "local",
      localPort: Number(body.localPort) || 8080,
      remoteHost: String(body.remoteHost || "-").slice(0, 120),
      remotePort: Number(body.remotePort) || 0,
      viaHost: String(body.viaHost || "unknown").slice(0, 60),
      status: "stopped",
    })
    .returning();
  return NextResponse.json({ tunnel: inserted[0] }, { status: 201 });
}
