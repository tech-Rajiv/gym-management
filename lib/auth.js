import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Who is signed in - without touching the database.
 *
 * On login the browser is given a cookie holding the admin's id, name and
 * email, plus a signature (HMAC-SHA256) made with a secret key only the server
 * knows. On every request the signature is checked in memory: a cookie that
 * was edited or made up does not match and is rejected. No session table, no
 * query per page.
 *
 * There is deliberately no expiry: a login lasts until Logout, or until the
 * browser itself drops the cookie (browsers cap a cookie at about 400 days).
 *
 * The key is AUTH_SECRET, from .env (and the hosting provider's environment
 * variables). Changing it signs everyone out.
 *
 * proxy.js turns away requests with no cookie at all; the signature check
 * here is what actually protects the data.
 */

export const SESSION_COOKIE = "aura_session";

/** As long as browsers allow a cookie to live - effectively "until Logout". */
const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

/**
 * The signing key, from AUTH_SECRET. Required: without it nobody could be
 * signed in safely, so the app says so plainly rather than guessing a key.
 */
function signingKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set. Add it to .env (and to the hosting provider) to sign in.");
  }
  return createHash("sha256").update(secret).digest();
}

const encode = (value) => Buffer.from(value).toString("base64url");
const sign = (payload) => createHmac("sha256", signingKey()).update(payload).digest("base64url");

/** The cookie's value for an admin: "<data>.<signature>". */
export function createSessionToken(admin) {
  const payload = encode(JSON.stringify({ id: admin.id, name: admin.name, email: admin.email }));
  return `${payload}.${sign(payload)}`;
}

/** The admin a cookie belongs to, or null when it is missing, edited or made up. */
function readSessionToken(token) {
  if (typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  // A constant-time comparison, so the signature cannot be guessed byte by byte.
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const admin = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isInteger(admin?.id) ? admin : null;
  } catch {
    return null;
  }
}

/** Cookie settings shared by login (set) and logout (clear). */
export function sessionCookieOptions({ clear = false } = {}) {
  return {
    httpOnly: true, // never readable from browser JavaScript
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: clear ? 0 : COOKIE_MAX_AGE_SECONDS,
  };
}

/**
 * The signed-in admin ({ id, name, email }), or null.
 *
 * Wrapped in React's `cache` so the layout and the page rendering the same
 * request read the cookie once.
 */
export const getCurrentAdmin = cache(async () => {
  const cookieStore = await cookies();
  return readSessionToken(cookieStore.get(SESSION_COOKIE)?.value);
});

/** For pages: the signed-in admin, or a redirect to the login page. */
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login");
  return admin;
}
