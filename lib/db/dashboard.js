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
 *     badge uses. The "Expiring Soon" card and the "Expiring Soon" badge
 *     therefore cannot disagree about who is expiring.
 *
 * Members who have left the gym are not counted anywhere on the dashboard.
 *
 * The lists only fetch the first few rows (DASHBOARD_LIST_SIZE); the stat
 * counts say how many more there are, and "See N more" opens the full list.
 */

/** How many members each dashboard list shows before "See N more". */
export const DASHBOARD_LIST_SIZE = 3;

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
        )::int AS expired,

        count(*) FILTER (
          WHERE join_date >= ${startOfMonth(referenceDate)}::date
            AND join_date <= ${referenceDate}::date
        )::int AS new_this_month
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
  limit = DASHBOARD_LIST_SIZE,
} = {}) {
  return query("load expiring memberships", async () => {
    return sql`
      SELECT
        -- Everything a list row and its "⋯" menu need.
        id, first_name, last_name, full_name, phone, member_status, join_date, photo_url, gender,
        plan_name, membership_start_date, membership_end_date,
        -- Their most recent payment, for the daily report's "Last paid".
        last_payment.amount  AS last_payment_amount,
        last_payment.paid_on AS last_payment_on
      FROM member_overview
      LEFT JOIN LATERAL (
        SELECT pay.amount, pay.paid_on
        FROM payments pay
        WHERE pay.member_id = member_overview.id
        ORDER BY pay.paid_on DESC, pay.id DESC
        LIMIT 1
      ) last_payment ON true
      WHERE member_status = 'active'
        AND membership_end_date >= ${referenceDate}::date
        AND membership_end_date <= ${referenceDate}::date + ${expiringSoonDays}::int
      ORDER BY membership_end_date ASC, full_name ASC
      LIMIT ${limit}
    `;
  });
}

/**
 * Members whose membership has already run out, most recently expired first -
 * the people most likely to renew if someone calls them now.
 */
export async function getExpiredMembers({
  referenceDate = today(),
  limit = DASHBOARD_LIST_SIZE,
} = {}) {
  return query("load expired memberships", async () => {
    return sql`
      SELECT
        -- Everything a list row and its "⋯" menu need.
        id, first_name, last_name, full_name, phone, member_status, join_date, photo_url, gender,
        plan_name, membership_start_date, membership_end_date,
        -- Their most recent payment, for the daily report's "Last paid".
        last_payment.amount  AS last_payment_amount,
        last_payment.paid_on AS last_payment_on
      FROM member_overview
      LEFT JOIN LATERAL (
        SELECT pay.amount, pay.paid_on
        FROM payments pay
        WHERE pay.member_id = member_overview.id
        ORDER BY pay.paid_on DESC, pay.id DESC
        LIMIT 1
      ) last_payment ON true
      WHERE member_status = 'active'
        AND membership_end_date < ${referenceDate}::date
      ORDER BY membership_end_date DESC, full_name ASC
      LIMIT ${limit}
    `;
  });
}

/** Members who joined during the current calendar month, newest first. */
export async function getNewMembersThisMonth({
  referenceDate = today(),
  limit = DASHBOARD_LIST_SIZE,
} = {}) {
  return query("load this month's new members", async () => {
    return sql`
      SELECT
        -- Everything a list row and its "⋯" menu need.
        id, first_name, last_name, full_name, phone, member_status, join_date, photo_url, gender,
        plan_name, membership_start_date, membership_end_date,
        -- Their most recent payment, for the daily report's "Last paid".
        last_payment.amount  AS last_payment_amount,
        last_payment.paid_on AS last_payment_on
      FROM member_overview
      LEFT JOIN LATERAL (
        SELECT pay.amount, pay.paid_on
        FROM payments pay
        WHERE pay.member_id = member_overview.id
        ORDER BY pay.paid_on DESC, pay.id DESC
        LIMIT 1
      ) last_payment ON true
      WHERE member_status = 'active'
        AND join_date >= ${startOfMonth(referenceDate)}::date
        AND join_date <= ${referenceDate}::date
      ORDER BY join_date DESC, id DESC
      LIMIT ${limit}
    `;
  });
}
