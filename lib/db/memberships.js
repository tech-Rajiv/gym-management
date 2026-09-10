import "server-only";

import { sql, query, toId } from "@/lib/db";

/**
 * Membership queries.
 *
 * A membership is one term a member has bought. Members accumulate these over
 * time, which is what makes renewal history possible.
 */

/**
 * Every term a member has ever held, newest first.
 * Used by the member detail page to show their history.
 */
export async function getMembershipsByMemberId(id) {
  const memberId = toId(id);
  if (!memberId) return [];

  return query("load the membership history", async () => {
    return sql`
      SELECT
        ms.id,
        ms.membership_plan_id,
        p.name AS plan_name,
        ms.start_date,
        ms.end_date,
        ms.price,
        ms.status,
        ms.created_at
      FROM memberships ms
      JOIN membership_plans p ON p.id = ms.membership_plan_id
      WHERE ms.member_id = ${memberId}
      ORDER BY ms.end_date DESC, ms.id DESC
    `;
  });
}

/**
 * The member's current term - the non-cancelled one running latest.
 * Returns null for a member whose only terms were cancelled.
 */
export async function getCurrentMembership(id) {
  const memberId = toId(id);
  if (!memberId) return null;

  return query("load the current membership", async () => {
    const [membership] = await sql`
      SELECT
        ms.id,
        ms.membership_plan_id,
        p.name AS plan_name,
        ms.start_date,
        ms.end_date,
        ms.price,
        ms.status
      FROM memberships ms
      JOIN membership_plans p ON p.id = ms.membership_plan_id
      WHERE ms.member_id = ${memberId}
        AND ms.status <> 'cancelled'
      ORDER BY ms.end_date DESC, ms.id DESC
      LIMIT 1
    `;
    return membership ?? null;
  });
}
