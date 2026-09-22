import { NextRequest, NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { hosts } from "@/db/schema";
import { ensureSeed } from "@/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const rows = await db.select().from(hosts).orderBy(asc(hosts.groupName), asc(hosts.name));
  return NextResponse.json({ hosts: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.hostname) {
    return NextResponse.json({ error: "name and hostname required" }, { status: 400 });
  }
  const values = {
    name: String(body.name).slice(0, 60),
    hostname: String(body.hostname).slice(0, 120),
    port: Number(body.port) || 22,
    username: String(body.username || "root").slice(0, 40),
    authType: ["key", "password", "agent"].includes(body.authType) ? body.authType : "key",
    groupName: String(body.groupName || "default").slice(0, 40),
    tags: Array.isArray(body.tags) ? body.tags.map((t: unknown) => String(t).slice(0, 24)).slice(0, 8) : [],
    color: String(body.color || "#00ff9c").slice(0, 16),
    notes: body.notes ? String(body.notes).slice(0, 500) : null,
  };
  const inserted = await db.insert(hosts).values(values).returning();
  return NextResponse.json({ host: inserted[0] }, { status: 201 });
}
