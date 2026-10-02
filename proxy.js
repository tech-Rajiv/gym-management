import { NextResponse } from "next/server";

/**
 * Keeps signed-out visitors on the login page.
 *
 * (Next.js 16 renamed Middleware to Proxy - this file runs before every
 * matched request.)
 *
 * This is an optimistic check: it only looks for the session cookie, without
 * touching the database, because it runs on every request including prefetches.
 * A cookie existing proves nothing on its own, so every page and API route
 * also verifies the session against the database (lib/auth.js). This file is
 * what makes a signed-out visitor land on /login instead of an error.
 *
 * Kept free of imports from lib/ so it stays small and has no server-only
 * dependencies; the cookie name below must match SESSION_COOKIE in lib/auth.js.
 */

const SESSION_COOKIE = "aura_session";

/** Reachable without being signed in. */
const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.includes(pathname)) return NextResponse.next();

  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();

  // An API caller wants JSON it can act on, not the login page's HTML.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { ok: false, message: "Your session has ended. Please log in again.", errors: {} },
      { status: 401 }
    );
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // Everything except Next.js's own assets and files in public/.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
