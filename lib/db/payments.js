import "server-only";

import { sql, query } from "@/lib/db";

/**
 * Payment queries.
 *
 * A payment is a record of money already received - the application never
 * moves money. Most payments pay for one membership term, and several can pay
 * for the same term, which is what makes part payments work.
 *
 * Nothing here decides whether a term is Paid, Partial or Unpaid; that is
 * derived in lib/utils/paymentStatus.js from the amounts these queries return.
 */

/**
 * The full payment history, newest first.
 *
 * @param {string} [search] matches member name, phone, UTR or remark
 * @param {string} [method] "upi" or "cash", or nothing for both
 *
 * Both are passed as parameters and tested with `IS NULL OR ...` so one query
 * text covers every combination and no user input is read as SQL.
 */
export async function getPayments({ search, method } = {}) {
  const term = search?.trim() ? `%${search.trim()}%` : null;
  const methodFilter = method === "upi" || method === "cash" ? method : null;

  return query("load payments", async () => {
    return sql`
      SELECT * FROM payment_overview
      WHERE (
              ${term}::text IS NULL
              OR member_name ILIKE ${term}
              OR member_phone ILIKE ${term}
              OR reference ILIKE ${term}
              OR remark ILIKE ${term}
            )
        AND (${methodFilter}::text IS NULL OR method = ${methodFilter})
      ORDER BY paid_on DESC, id DESC
    `;
  });
}

/** Every payment a single member has made, newest first. */
export async function getPaymentsByMemberId(memberId) {
  return query("load the member's payments", async () => {
    return sql`
      SELECT * FROM payment_overview
      WHERE member_id = ${memberId}
      ORDER BY paid_on DESC, id DESC
    `;
  });
}

/** One payment, or null when the id is unknown. */
export async function getPaymentById(id) {
  return query("load the payment", async () => {
    const [payment] = await sql`
      SELECT * FROM payment_overview WHERE id = ${id}
    `;
    return payment ?? null;
  });
}

/**
 * Totals for the payment history header and the dashboard.
 * Counted in one pass with FILTER rather than three separate queries.
 */
export async function getPaymentTotals({ search, method } = {}) {
  const term = search?.trim() ? `%${search.trim()}%` : null;
  const methodFilter = method === "upi" || method === "cash" ? method : null;

  return query("total up payments", async () => {
    const [totals] = await sql`
      SELECT
        count(*)::int AS count,
        COALESCE(sum(amount), 0) AS total,
        COALESCE(sum(amount) FILTER (WHERE method = 'upi'), 0) AS upi_total,
        COALESCE(sum(amount) FILTER (WHERE method = 'cash'), 0) AS cash_total
      FROM payment_overview
      WHERE (
              ${term}::text IS NULL
              OR member_name ILIKE ${term}
              OR member_phone ILIKE ${term}
              OR reference ILIKE ${term}
              OR remark ILIKE ${term}
            )
        AND (${methodFilter}::text IS NULL OR method = ${methodFilter})
    `;
    return totals;
  });
}

/** Money taken during the current calendar month, for the dashboard card. */
export async function getRevenueThisMonth({ monthStart, referenceDate }) {
  return query("total this month's payments", async () => {
    const [row] = await sql`
      SELECT COALESCE(sum(amount), 0) AS total
      FROM payments
      WHERE paid_on >= ${monthStart}::date
        AND paid_on <= ${referenceDate}::date
    `;
    return row.total;
  });
}

/**
 * Records a payment against an existing membership term.
 *
 * @returns {Promise<number>} the new payment's id
 */
export async function createPayment(data) {
  return query("record the payment", async () => {
    const [payment] = await sql`
      INSERT INTO payments (
        member_id, membership_id, amount, method, paid_on, reference, remark
      )
      VALUES (
        ${data.memberId}, ${data.membershipId}, ${data.amount}, ${data.method},
        ${data.paidOn}, ${data.reference}, ${data.remark}
      )
      RETURNING id
    `;
    return payment.id;
  });
}

/**
 * Creates a new membership term and records the payment for it, together.
 *
 * This is how a renewal happens: the owner records the money, and the term it
 * bought comes into existence with it. Both rows are written by a single
 * statement using a CTE, so a payment can never be left pointing at a term
 * that failed to be created, and it costs one round trip instead of two.
 *
 * The price is what the owner actually charged, which may differ from the
 * plan's list price - a discount, or a part payment on a full-price term.
 *
 * @returns {Promise<{paymentId: number, membershipId: number}>}
 */
export async function createPaymentWithMembership(data) {
  return query("record the payment and membership", async () => {
    const [row] = await sql`
      WITH new_membership AS (
        INSERT INTO memberships (
          member_id, membership_plan_id, start_date, end_date, price
        )
        VALUES (
          ${data.memberId}, ${data.membershipPlanId},
          ${data.membershipStartDate}, ${data.membershipEndDate},
          ${data.termPrice}
        )
        RETURNING id
      )
      INSERT INTO payments (
        member_id, membership_id, amount, method, paid_on, reference, remark
      )
      SELECT
        ${data.memberId}, new_membership.id, ${data.amount}, ${data.method},
        ${data.paidOn}, ${data.reference}, ${data.remark}
      FROM new_membership
      RETURNING id AS payment_id, membership_id
    `;
    return { paymentId: row.payment_id, membershipId: row.membership_id };
  });
}

/**
 * Deletes a payment.
 *
 * The membership term it paid for is deliberately left alone: removing a
 * mistyped receipt should not cancel somebody's gym access. The term simply
 * goes back to reading as Unpaid.
 *
 * @returns {Promise<boolean>} false when no payment has that id
 */
export async function deletePayment(id) {
  return query("delete the payment", async () => {
    const deleted = await sql`DELETE FROM payments WHERE id = ${id} RETURNING id`;
    return deleted.length > 0;
  });
}
