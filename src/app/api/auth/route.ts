import { NextRequest, NextResponse } from "next/server";
import {
  createSessionToken,
  isValidAccessKey,
  verifySessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  getAccessKey,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSecure(req: NextRequest): boolean {
  return (
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https"
  );
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerKey = authHeader.slice(7).trim();
    if (bearerKey === getAccessKey()) {
      return NextResponse.json({ ok: true, authenticated: true });
    }
  }

  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isValid = await verifySessionToken(sessionCookie);

  return NextResponse.json({ ok: true, authenticated: isValid });
}

export async function POST(req: NextRequest) {
  let body: { key?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const key = body.key?.trim() ?? "";
  if (!isValidAccessKey(key)) {
    return NextResponse.json({ ok: false, error: "Invalid access key" }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isSecure(req),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}

export async function DELETE(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isSecure(req),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
