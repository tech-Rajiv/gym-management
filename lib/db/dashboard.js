import "server-only";

import { sql, query } from "@/lib/db";
import { EXPIRING_SOON_DAYS } from "@/lib/config";
import { today } from "@/lib/utils/dates";

/**
 * Dashboard queries.
 *
 * Two things are deliberate here:
 *
 *   * "Today" is passed in from the application, never taken from the database
 *     with current_date. Neon's clock is UTC; the gym is not. See lib/config.js.
 *
 *   * The expiry window is EXPIRING_SOON_DAYS, the same constant the status
 *     badge uses. The "Expiring Soon" card and the "Expiring Soon" badge
 *     therefore cannot disagree about who is expiring.
 *
 * Members who have left the gym are not counted anywhere on the dashboard.
 */

/**
 * The summary numbers, counted in one pass over the member list.
 *
 * FILTER lets a single scan produce every count, so the dashboard makes one
 * query rather than one per card.
 */
export async function getDashboardStats({
  referenceDate = today(),
  expiringSoonDays = EXPIRING_SOON_DAYS,
} = {}) {
  return query("load the dashboard summary", async () => {
    const [stats] = await sql`
      SELECT
        count(*)::int AS total_members,

        count(*) FILTER (
          WHERE membership_end_date >= ${referenceDate}::date
            AND membership_end_date <= ${referenceDate}::date + ${expiringSoonDays}::int
        )::int AS expiring_soon,

        count(*) FILTER (
          WHERE membership_end_date < ${referenceDate}::date
        )::int AS expired
      FROM member_overview
      WHERE member_status = 'active'
    `;
    return stats;
  });
}

/**
 * Members whose membership runs out inside the expiry window, soonest first.
 * Already-expired members are left out - this list is a call sheet for
 * renewals that can still be saved.
 */
export async function getExpiringMembers({
  referenceDate = today(),
  expiringSoonDays = EXPIRING_SOON_DAYS,
} = {}) {
  return query("load expiring memberships", async () => {
    return sql`
      SELECT
        id,
        full_name,
        phone,
        plan_name,
        membership_start_date,
        membership_end_date
      FROM member_overview
      WHERE member_status = 'active'
        AND membership_end_date >= ${referenceDate}::date
        AND membership_end_date <= ${referenceDate}::date + ${expiringSoonDays}::int
      ORDER BY membership_end_date ASC, full_name ASC
    `;
  });
}

/**
 * Members whose membership has already run out, most recently expired first -
 * the people most likely to renew if someone calls them now.
 */
export async function getExpiredMembers({ referenceDate = today() } = {}) {
  return query("load expired memberships", async () => {
    return sql`
      SELECT
        id,
        full_name,
        phone,
        plan_name,
        membership_start_date,
        membership_end_date
      FROM member_overview
      WHERE member_status = 'active'
        AND membership_end_date < ${referenceDate}::date
      ORDER BY membership_end_date DESC, full_name ASC
    `;
  });
}
