import "server-only";

import { sql, query } from "@/lib/db";

/**
 * Admin queries.
 *
 * Only logging in reads the database. After that, who is signed in is carried
 * in a signed cookie and checked without a query - see lib/auth.js.
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
