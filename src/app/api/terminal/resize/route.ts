import { NextRequest, NextResponse } from "next/server";
import { ptyManager } from "@/lib/pty-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    cols?: number;
    rows?: number;
  } | null;
  if (!body?.id || !body.cols || !body.rows) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const ok = ptyManager.resize(body.id, body.cols, body.rows);
  return NextResponse.json({ ok });
}
