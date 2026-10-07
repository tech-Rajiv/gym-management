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
 * Passwords are compared as plain text for now - see the note on the owners
 * table in database/schema.sql. Email is matched case-insensitively, since
 * "Hiren@gmail.com" and "hiren@gmail.com" are the same inbox.
 */
/**
 * The founder or gym owner with this email and password, or null.
 *
 * Founders are checked first. A founder and a gym owner are different
 * accounts, even if someone reused an email: the founder login wins, and the
 * gym app is never opened for that cookie.
 */
export async function findAccountByCredentials(email, password) {
  return query("check the login details", async () => {
    const [founder] = await sql`
      SELECT id, name, email
      FROM operators
      WHERE lower(email) = lower(${email})
        AND password = ${password}
    `;
    if (founder) return { ...founder, role: "founder" };

    const [admin] = await sql`
      SELECT a.id, a.name, a.email, a.gym_id, g.name AS gym_name
      FROM owners a
      JOIN gyms g ON g.id = a.gym_id
      WHERE lower(a.email) = lower(${email})
        AND a.password = ${password}
    `;
    if (!admin) return null;
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: "owner",
      gymId: admin.gym_id,
      gymName: admin.gym_name,
    };
  });
}

/**
 * The first admin - who the daily report greets when it is sent by the
 * schedule rather than by someone pressing the button.
 */
export async function getPrimaryAdmin() {
  return query("load the admin", async () => {
    const [admin] = await sql`
      SELECT id, name, email, gym_id
      FROM owners
      ORDER BY id
      LIMIT 1
    `;
    if (!admin) return null;
    return { ...admin, gymId: admin.gym_id };
  });
}
