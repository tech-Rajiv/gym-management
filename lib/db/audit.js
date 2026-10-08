import "server-only";

import { sql, query, requireGymId } from "@/lib/db";
import { GYM_TIMEZONE } from "@/lib/config";

/**
 * Audit log queries.
 *
 * Every write in the application records who made it, and it does so in the
 * same statement or transaction as the change itself. A change and its log
 * entry therefore succeed or fail together: there is no way to end up with a
 * change nobody can account for.
 *
 * The repositories that make changes write their log entries themselves, either
 * with `auditEntry` below inside a transaction or as a CTE when the new row's
 * id is only known once it has been inserted.
 *
 * Nothing here ever updates or deletes a log row.
 */

/** Page size for the history list. */
export const AUDIT_PAGE_SIZE = 50;

/**
 * An INSERT into audit_logs, returned unawaited so it can be passed to
 * `sql.transaction([...])` next to the change it describes.
 *
 * @param {{id: number, name: string}} actor the admin making the change
 */
export function auditEntry(actor, { action, entityType, entityId = null, entityLabel = null, details = {} }) {
  const gymId = requireGymId(actor.gymId);
  return sql`
    INSERT INTO audit_logs (
      admin_id, admin_name, action, entity_type, entity_id, entity_label, details, gym_id
    )
    VALUES (
      ${actor.id}, ${actor.name}, ${action}, ${entityType}, ${entityId},
      ${entityLabel}, ${JSON.stringify(details)}::jsonb, ${gymId}
    )
  `;
}

/**
 * One page of the history, newest first.
 *
 * @param {string} [from] earliest day, "YYYY-MM-DD", inclusive
 * @param {string} [to]   latest day, "YYYY-MM-DD", inclusive
 * @param {number} [page] 1-based
 *
 * The days are the gym's own calendar days: created_at is a moment in UTC, so
 * it is turned into a date in GYM_TIMEZONE before comparing - an entry made at
 * 1 AM in India on the 1st belongs to the 1st, not the 30th. The dates are
 * already validated - see lib/utils/period.js.
 */
export async function getAuditLogs({ gymId, from = null, to = null, page = 1 } = {}) {
  const tenantId = requireGymId(gymId);
  const offset = (Math.max(1, page) - 1) * AUDIT_PAGE_SIZE;

  return query("load the history", async () => {
    return sql`
      SELECT
        id, admin_id, admin_name, action, entity_type, entity_id,
        entity_label, details, created_at
      FROM audit_logs
      WHERE gym_id = ${tenantId}
        AND (${from}::date IS NULL OR (created_at AT TIME ZONE ${GYM_TIMEZONE})::date >= ${from}::date)
        AND (${to}::date IS NULL OR (created_at AT TIME ZONE ${GYM_TIMEZONE})::date <= ${to}::date)
      ORDER BY created_at DESC, id DESC
      LIMIT ${AUDIT_PAGE_SIZE}
      OFFSET ${offset}
    `;
  });
}

/** How many log entries fall in the period - for the count and the paging. */
export async function getAuditCount({ gymId, from = null, to = null } = {}) {
  const tenantId = requireGymId(gymId);
  return query("count the history", async () => {
    const [row] = await sql`
      SELECT count(*)::int AS total
      FROM audit_logs
      WHERE gym_id = ${tenantId}
        AND (${from}::date IS NULL OR (created_at AT TIME ZONE ${GYM_TIMEZONE})::date >= ${from}::date)
        AND (${to}::date IS NULL OR (created_at AT TIME ZONE ${GYM_TIMEZONE})::date <= ${to}::date)
    `;
    return row.total;
  });
}
