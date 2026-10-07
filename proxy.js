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

/**
 * Reachable without being signed in. The daily-report route is called by
 * Upstash QStash, not a person; it checks QStash's signature itself.
 */
const PUBLIC_PATHS = ["/login", "/founder", "/api/auth/login", "/api/cron/daily-report"];

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });

  if (PUBLIC_PATHS.includes(pathname)) return next();

  if (request.cookies.get(SESSION_COOKIE)?.value) return next();

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
