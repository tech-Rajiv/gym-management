import { cookies } from "next/headers";
import { ok, fail, readJson } from "@/lib/api";
import { findAdminByCredentials } from "@/lib/db/auth";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/auth";

/**
 * POST /api/auth/login   { email, password }
 *
 * Checks the email and password against the admins table - the only database
 * call involved in being signed in - and sets the signed session cookie. Only
 * people with a row in the admins table can get in. See lib/auth.js.
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

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, createSessionToken(admin), sessionCookieOptions());

    return ok({ admin: { name: admin.name } });
  } catch (error) {
    return fail({ message: error?.message ?? "Could not log in. Please try again." }, 500);
  }
}
