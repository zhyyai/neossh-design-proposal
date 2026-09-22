import { NextRequest, NextResponse } from "next/server";
import { ptyManager } from "@/lib/pty-manager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    id?: string;
    data?: string;
  } | null;
  if (!body?.id || typeof body.data !== "string" || body.data.length > 65536) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const ok = ptyManager.write(body.id, body.data);
  return NextResponse.json({ ok });
}
