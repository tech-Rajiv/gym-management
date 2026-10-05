import "server-only";

import { sql, query } from "@/lib/db";

/**
 * Admin and session queries.
 *
 * A session is a row in admin_sessions keyed by a random token. The browser
 * holds only that token, in an httpOnly cookie; who it belongs to is looked up
 * here on every request.
 *
 * Logging in and out is deliberately not written to the audit log - History
 * Logs is for changes to the gym's data, and logins would only bury them.
 */

/**
 * The admin with this email and password, or null.
 *
 * Passwords are compared as plain text for now - see the note on the admins
 * table in database/schema.sql. Email is matched case-insensitively, since
 * "Hiren@gmail.com" and "hiren@gmail.com" are the same inbox.
 */
export async function findAdminByCredentials(email, password) {
  return query("check the login details", async () => {
    const [admin] = await sql`
      SELECT id, name, email
      FROM admins
      WHERE lower(email) = lower(${email})
        AND password = ${password}
    `;
    return admin ?? null;
  });
}

/** Starts a session for the admin. */
export async function createSession(admin, token, expiresAt) {
  return query("start the session", async () => {
    await sql`
      INSERT INTO admin_sessions (token, admin_id, expires_at)
      VALUES (${token}, ${admin.id}, ${expiresAt.toISOString()})
    `;
  });
}

/**
 * The first admin - who the daily report greets when it is sent by the
 * schedule rather than by someone pressing the button.
 */
export async function getPrimaryAdmin() {
  return query("load the admin", async () => {
    const [admin] = await sql`SELECT id, name, email FROM admins ORDER BY id LIMIT 1`;
    return admin ?? null;
  });
}

/** The admin a live session belongs to, or null when it is unknown or expired. */
export async function getAdminBySessionToken(token) {
  if (!token) return null;

  return query("check the session", async () => {
    const [admin] = await sql`
      SELECT a.id, a.name, a.email
      FROM admin_sessions s
      JOIN admins a ON a.id = s.admin_id
      WHERE s.token = ${token}
        AND s.expires_at > now()
    `;
    return admin ?? null;
  });
}

/** Ends a session, so its cookie stops working everywhere. */
export async function endSession(token) {
  return query("end the session", async () => {
    await sql`DELETE FROM admin_sessions WHERE token = ${token}`;
  });
}
