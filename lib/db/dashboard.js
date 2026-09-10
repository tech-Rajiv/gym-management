import "server-only";

import { sql, query } from "@/lib/db";
import { EXPIRING_SOON_DAYS } from "@/lib/config";
import { today, startOfMonth } from "@/lib/utils/dates";

/**
 * Dashboard queries.
 *
 * Two things are deliberate here:
 *
 *   * "Today" is passed in from the application, never taken from the database
 *     with current_date. Neon's clock is UTC; the gym is not. See lib/config.js.
 *
 *   * The expiry window is EXPIRING_SOON_DAYS, the same constant the status
 *     badge uses. The "Expiring This Week" card and the "Expiring Soon" badge
 *     therefore cannot disagree about who is expiring.
 */

/**
 * The four summary numbers, counted in one pass over the member list.
 *
 * FILTER lets a single scan produce every count, so the dashboard makes one
 * query rather than four.
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
        )::int AS active_members,

        count(*) FILTER (
          WHERE join_date >= ${startOfMonth(referenceDate)}::date
        )::int AS new_this_month,

        count(*) FILTER (
          WHERE membership_end_date >= ${referenceDate}::date
            AND membership_end_date <= ${referenceDate}::date + ${expiringSoonDays}::int
        )::int AS expiring_this_week
      FROM member_overview
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
        membership_end_date
      FROM member_overview
      WHERE membership_end_date >= ${referenceDate}::date
        AND membership_end_date <= ${referenceDate}::date + ${expiringSoonDays}::int
      ORDER BY membership_end_date ASC, full_name ASC
    `;
  });
}

/** Members who joined during the current calendar month, most recent first. */
export async function getNewMembersThisMonth({ referenceDate = today() } = {}) {
  return query("load this month's new members", async () => {
    return sql`
      SELECT
        id,
        full_name,
        phone,
        plan_name,
        join_date
      FROM member_overview
      WHERE join_date >= ${startOfMonth(referenceDate)}::date
        AND join_date <= ${referenceDate}::date
      ORDER BY join_date DESC, id DESC
    `;
  });
}
