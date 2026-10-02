import { cookies } from "next/headers";
import { ok } from "@/lib/api";
import { endSession } from "@/lib/db/auth";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

/**
 * POST /api/auth/logout
 *
 * Ends the session in the database and clears the cookie. A cookie that no
 * longer matches a session is cleared too, so logging out always succeeds
 * from the browser's point of view.
 */
export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  try {
    if (token) await endSession(token);
  } catch {
    // Already logged by lib/db. The cookie is cleared regardless below.
  }

  cookieStore.set(SESSION_COOKIE, "", sessionCookieOptions(new Date(0)));
  return ok();
}
