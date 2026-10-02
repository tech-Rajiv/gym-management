import "server-only";

import { sql, query } from "@/lib/db";

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

/** The entity filters offered on the history page. */
export const AUDIT_FILTERS = [
  { value: "all", label: "All" },
  { value: "member", label: "Members" },
  { value: "payment", label: "Payments" },
  { value: "plan", label: "Plans" },
];

export function normalizeAuditFilter(value) {
  return AUDIT_FILTERS.some((filter) => filter.value === value) ? value : "all";
}

/**
 * An INSERT into audit_logs, returned unawaited so it can be passed to
 * `sql.transaction([...])` next to the change it describes.
 *
 * @param {{id: number, name: string}} actor the admin making the change
 */
export function auditEntry(actor, { action, entityType, entityId = null, entityLabel = null, details = {} }) {
  return sql`
    INSERT INTO audit_logs (
      admin_id, admin_name, action, entity_type, entity_id, entity_label, details
    )
    VALUES (
      ${actor.id}, ${actor.name}, ${action}, ${entityType}, ${entityId},
      ${entityLabel}, ${JSON.stringify(details)}::jsonb
    )
  `;
}

/**
 * One page of the history, newest first.
 *
 * @param {string} [entity] one of the AUDIT_FILTERS values
 * @param {number} [page]   1-based
 */
export async function getAuditLogs({ entity = "all", page = 1 } = {}) {
  const filter = normalizeAuditFilter(entity);
  const offset = (Math.max(1, page) - 1) * AUDIT_PAGE_SIZE;

  return query("load the history", async () => {
    return sql`
      SELECT
        id, admin_id, admin_name, action, entity_type, entity_id,
        entity_label, details, created_at
      FROM audit_logs
      WHERE ${filter}::text = 'all' OR entity_type = ${filter}
      ORDER BY created_at DESC, id DESC
      LIMIT ${AUDIT_PAGE_SIZE}
      OFFSET ${offset}
    `;
  });
}

/** How many log rows each filter would show, for the tab counts and paging. */
export async function getAuditCounts() {
  return query("count the history", async () => {
    const [counts] = await sql`
      SELECT
        count(*)::int AS all,
        count(*) FILTER (WHERE entity_type = 'member')::int  AS member,
        count(*) FILTER (WHERE entity_type = 'payment')::int AS payment,
        count(*) FILTER (WHERE entity_type = 'plan')::int    AS plan
      FROM audit_logs
    `;
    return counts;
  });
}
