import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  verifySessionToken,
  getAccessKey,
} from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions (.svg, .png, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

const PUBLIC_EXACT = new Set(["/", "/login"]);
const PUBLIC_PREFIXES = ["/api/auth", "/api/health"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public routes
  if (PUBLIC_EXACT.has(pathname)) {
    // If user is already authenticated and visits /login, redirect to /dashboard
    if (pathname === "/login") {
      const cookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      if (await verifySessionToken(cookie)) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return NextResponse.next();
  }

  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  // 2. Check Authorization Header (Bearer token for API clients / automation)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerKey = authHeader.slice(7).trim();
    if (bearerKey === getAccessKey()) {
      return NextResponse.next();
    }
  }

  // 3. Check Session Cookie
  const sessionCookie = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = await verifySessionToken(sessionCookie);

  if (isAuthenticated) {
    return NextResponse.next();
  }

  // 4. Handle Unauthenticated Requests
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Unauthorized. Valid session cookie or Authorization Bearer key required." },
      { status: 401 }
    );
  }

  // Redirect unauthenticated page requests to /login
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
