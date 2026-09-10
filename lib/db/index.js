import "server-only";

import { neon, types } from "@neondatabase/serverless";

/**
 * Database connection.
 *
 * `server-only` at the top makes the build fail if any of this is ever
 * imported into a Client Component, so DATABASE_URL cannot reach the browser.
 *
 * Neon's HTTP driver is used rather than a pooled TCP client: each query is a
 * single stateless request, which is exactly what a serverless-friendly
 * Next.js app wants. There is no connection to keep alive between renders.
 */

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env before starting the application."
  );
}

// --- Type parsers -----------------------------------------------------------
// Postgres OID 1082 is `date`. By default the driver would turn it into a
// JavaScript Date at midnight UTC, which formats as the previous day in any
// negative-offset timezone. Returning the raw "YYYY-MM-DD" string keeps
// calendar dates as calendar dates. See lib/utils/dates.js.
types.setTypeParser(1082, (value) => value);

// OID 1700 is `numeric`. The driver returns it as a string to protect the
// precision of very large values. Prices in a gym are small, so a number is
// more convenient for formatting and arithmetic.
types.setTypeParser(1700, (value) => Number(value));

export const sql = neon(process.env.DATABASE_URL);

/**
 * Postgres error codes worth reacting to by name instead of by number.
 * https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const PG_ERROR = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
  NOT_NULL_VIOLATION: "23502",
};

/**
 * The error every repository function throws when something goes wrong.
 *
 * `message` is safe to show a user. The original database error is kept on
 * `cause` for the server log, so raw SQL never reaches the UI.
 */
export class DatabaseError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = "DatabaseError";
    this.cause = cause;
  }
}

/**
 * Runs a database call and converts anything that goes wrong into a
 * DatabaseError carrying a readable message.
 *
 * @param {string} description what was being attempted, e.g. "load members"
 * @param {() => Promise<any>} run the query to execute
 */
export async function query(description, run) {
  try {
    return await run();
  } catch (error) {
    // A DatabaseError was raised deliberately, with a message already written
    // for the user. Let it through rather than replacing it with a vaguer one.
    if (error instanceof DatabaseError) throw error;

    // Logged in full on the server; the UI only ever sees the message below.
    console.error(`[db] Failed to ${description}:`, error);

    if (error?.code) {
      // PostgreSQL rejected the query. Callers can still inspect `cause` to
      // recognise a specific failure, such as a duplicate phone number.
      throw new DatabaseError(`Could not ${description}.`, error);
    }

    // No error code means the query never reached PostgreSQL.
    throw new DatabaseError(
      `Could not ${description}. The database could not be reached.`,
      error
    );
  }
}

/**
 * Turns a route parameter into a usable row id, or null when it cannot be one.
 *
 * Ids arrive from the URL as strings and can be anything a visitor types.
 * Passing "abc" to a query against an integer column makes PostgreSQL raise a
 * type error, which would surface as "something went wrong" when the honest
 * answer is that no such member exists. Checking here means every repository
 * function is safe to call with whatever the URL contained.
 */
export function toId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** True when an error is a unique-constraint violation on the given column. */
export function isUniqueViolation(error, column) {
  const cause = error?.cause ?? error;
  if (cause?.code !== PG_ERROR.UNIQUE_VIOLATION) return false;
  if (!column) return true;
  // Postgres names the constraint after the table and column, e.g.
  // "members_phone_key", and also reports it in the error detail.
  return (
    cause.constraint?.includes(column) || cause.detail?.includes(`(${column})`)
  );
}
