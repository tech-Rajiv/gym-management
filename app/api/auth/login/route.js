import { cookies } from "next/headers";
import { ok, fail, readJson } from "@/lib/api";
import { findAdminByCredentials, createSession } from "@/lib/db/auth";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  newSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";

/**
 * POST /api/auth/login   { email, password }
 *
 * Starts a session for an admin and sets the session cookie. Only people with
 * a row in the admins table can get in.
 *
 * A wrong email and a wrong password get the same message, so the form does
 * not reveal which admin emails exist.
 */
export async function POST(request) {
  const body = await readJson(request);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const errors = {};
  if (!email) errors.email = "Email is required.";
  if (!password) errors.password = "Password is required.";
  if (Object.keys(errors).length > 0) return fail({ errors });

  try {
    const admin = await findAdminByCredentials(email, password);
    if (!admin) {
      return fail({ message: "That email and password do not match an admin account." }, 401);
    }

    const token = newSessionToken();
    const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
    await createSession(admin, token, expires);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions(expires));

    return ok({ admin: { name: admin.name } });
  } catch (error) {
    return fail({ message: error?.message ?? "Could not log in. Please try again." }, 500);
  }
}
