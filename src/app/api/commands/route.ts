import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { commandLogs } from "@/db/schema";
import { ensureSeed } from "@/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureSeed();
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 100, 300);
  const rows = await db
    .select()
    .from(commandLogs)
    .orderBy(desc(commandLogs.executedAt))
    .limit(limit);
  return NextResponse.json({ commands: rows });
}
