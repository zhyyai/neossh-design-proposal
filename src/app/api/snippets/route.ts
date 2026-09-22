import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { snippets } from "@/db/schema";
import { ensureSeed } from "@/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const rows = await db.select().from(snippets).orderBy(desc(snippets.usageCount));
  return NextResponse.json({ snippets: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.command) {
    return NextResponse.json({ error: "title and command required" }, { status: 400 });
  }
  const inserted = await db
    .insert(snippets)
    .values({
      title: String(body.title).slice(0, 80),
      command: String(body.command).slice(0, 1000),
      description: body.description ? String(body.description).slice(0, 300) : null,
      category: String(body.category || "general").slice(0, 40),
      danger: Boolean(body.danger),
    })
    .returning();
  return NextResponse.json({ snippet: inserted[0] }, { status: 201 });
}
