import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

/**
 * GET /api/auth/end-session
 *
 * Signs the gym owner out when their software cover has ended, then sends
 * them to the login page. The next sign-in explains that and opens payment.
 */
export async function GET(request) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", sessionCookieOptions({ clear: true }));
  return NextResponse.redirect(new URL("/login", request.url));
}
