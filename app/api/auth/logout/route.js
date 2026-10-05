import { cookies } from "next/headers";
import { ok } from "@/lib/api";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

/**
 * POST /api/auth/logout
 *
 * Clears the session cookie. There is nothing to end in the database - who is
 * signed in lives only in that cookie (see lib/auth.js).
 */
export async function POST() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", sessionCookieOptions({ clear: true }));
  return ok();
}
