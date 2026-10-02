import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminBySessionToken } from "@/lib/db/auth";

/**
 * Who is signed in.
 *
 * proxy.js turns away any request without a session cookie, but a cookie
 * existing proves nothing - it could be expired, logged out, or made up. So
 * every page and every API route checks it against the database through the
 * helpers below. That check, not the proxy, is what actually protects data.
 */

export const SESSION_COOKIE = "aura_session";

/** How long a login lasts before the admin has to sign in again. */
export const SESSION_DAYS = 30;

/** Cookie settings shared by login (set) and logout (clear). */
export function sessionCookieOptions(expires) {
  return {
    httpOnly: true, // never readable from browser JavaScript
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

/** A long random session token - 32 bytes, hex encoded. */
export function newSessionToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * The signed-in admin, or null.
 *
 * Wrapped in React's `cache` so the layout and the page rendering the same
 * request share one database lookup rather than making one each.
 */
export const getCurrentAdmin = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return getAdminBySessionToken(token);
});

/** For pages: the signed-in admin, or a redirect to the login page. */
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  return admin;
}
