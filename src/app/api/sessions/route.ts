import { NextRequest, NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { ensureSeed } from "@/db/seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await ensureSeed();
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit")) || 50, 200);
  const rows = await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.startedAt))
    .limit(limit);
  return NextResponse.json({ sessions: rows });
}
