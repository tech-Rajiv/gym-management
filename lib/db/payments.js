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
 * The payment history, newest first.
 *
 * @param {string} [search] matches member name, phone, UTR or remark
 * @param {string} [from]   earliest payment date, "YYYY-MM-DD", inclusive
 * @param {string} [to]     latest payment date, "YYYY-MM-DD", inclusive
 *
 * Every filter is passed as a parameter and tested with `IS NULL OR ...` so
 * one query text covers every combination and no user input is read as SQL.
 * The dates are already validated - see lib/utils/period.js.
 */
export async function getPayments({ search, from = null, to = null } = {}) {
  const term = search?.trim() ? `%${search.trim()}%` : null;

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
        AND (${from}::date IS NULL OR paid_on >= ${from}::date)
        AND (${to}::date IS NULL OR paid_on <= ${to}::date)
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
 * Records a payment against an existing membership term, and logs it.
 *
 * The payment and its log entry are written by one statement. The log reads
 * the term's plan and dates from `memberships`, which already exists, so the
 * History page can say what the money was for.
 *
 * @returns {Promise<number>} the new payment's id
 */
export async function createPayment(data, actor) {
  return query("record the payment", async () => {
    const [payment] = await sql`
      WITH new_payment AS (
        INSERT INTO payments (
          member_id, membership_id, amount, method, paid_on, reference, remark
        )
        VALUES (
          ${data.memberId}, ${data.membershipId}, ${data.amount}, ${data.method},
          ${data.paidOn}, ${data.reference}, ${data.remark}
        )
        RETURNING *
      ),
      logged AS (
        INSERT INTO audit_logs (
          admin_id, admin_name, action, entity_type, entity_id, entity_label, details
        )
        SELECT
          ${actor.id}, ${actor.name}, 'create', 'payment', np.id,
          m.first_name || ' ' || m.last_name,
          jsonb_build_object(
            'memberId', np.member_id,
            'amount', np.amount,
            'method', np.method,
            'paidOn', np.paid_on,
            'reference', np.reference,
            'remark', np.remark,
            'plan', plan.name,
            'termStart', ms.start_date,
            'termEnd', ms.end_date,
            'newTerm', false
          )
        FROM new_payment np
        JOIN members m ON m.id = np.member_id
        LEFT JOIN memberships ms ON ms.id = np.membership_id
        LEFT JOIN membership_plans plan ON plan.id = ms.membership_plan_id
      )
      SELECT id FROM new_payment
    `;
    return payment.id;
  });
}

/**
 * Creates a new membership term and records the payment for it, together,
 * along with the log entry.
 *
 * This is how a renewal happens: the owner records the money, and the term it
 * bought comes into existence with it. Everything is written by a single
 * statement using CTEs, so a payment can never be left pointing at a term
 * that failed to be created, and it costs one round trip.
 *
 * The term's details for the log come from the new_membership CTE itself:
 * sibling CTEs share one snapshot, so the new row is not yet visible by
 * reading the memberships table.
 *
 * The price is what the owner actually charged, which may differ from the
 * plan's list price - a discount, or a part payment on a full-price term.
 *
 * @returns {Promise<{paymentId: number, membershipId: number}>}
 */
export async function createPaymentWithMembership(data, actor) {
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
        RETURNING *
      ),
      new_payment AS (
        INSERT INTO payments (
          member_id, membership_id, amount, method, paid_on, reference, remark
        )
        SELECT
          ${data.memberId}, new_membership.id, ${data.amount}, ${data.method},
          ${data.paidOn}, ${data.reference}, ${data.remark}
        FROM new_membership
        RETURNING *
      ),
      logged AS (
        INSERT INTO audit_logs (
          admin_id, admin_name, action, entity_type, entity_id, entity_label, details
        )
        SELECT
          ${actor.id}, ${actor.name}, 'create', 'payment', np.id,
          m.first_name || ' ' || m.last_name,
          jsonb_build_object(
            'memberId', np.member_id,
            'amount', np.amount,
            'method', np.method,
            'paidOn', np.paid_on,
            'reference', np.reference,
            'remark', np.remark,
            'plan', plan.name,
            'termStart', nm.start_date,
            'termEnd', nm.end_date,
            'termPrice', nm.price,
            'newTerm', true
          )
        FROM new_payment np
        JOIN new_membership nm ON nm.id = np.membership_id
        JOIN members m ON m.id = np.member_id
        LEFT JOIN membership_plans plan ON plan.id = nm.membership_plan_id
      )
      SELECT id AS payment_id, membership_id FROM new_payment
    `;
    return { paymentId: row.payment_id, membershipId: row.membership_id };
  });
}

/**
 * Deletes a payment, keeping a full copy of it in the audit log.
 *
 * The membership term it paid for is deliberately left alone: removing a
 * mistyped receipt should not cancel somebody's gym access. The term simply
 * goes back to reading as Unpaid.
 *
 * The log INSERT runs first, inside the same transaction, and copies the row
 * while it still exists - so what was deleted can always be looked up.
 *
 * @returns {Promise<boolean>} false when no payment has that id
 */
export async function deletePayment(id, actor) {
  return query("delete the payment", async () => {
    const [, deleted] = await sql.transaction([
      sql`
        INSERT INTO audit_logs (
          admin_id, admin_name, action, entity_type, entity_id, entity_label, details
        )
        SELECT
          ${actor.id}, ${actor.name}, 'delete', 'payment', po.id, po.member_name,
          jsonb_build_object(
            'memberId', po.member_id,
            'amount', po.amount,
            'method', po.method,
            'paidOn', po.paid_on,
            'reference', po.reference,
            'remark', po.remark,
            'plan', po.plan_name,
            'termStart', po.membership_start_date,
            'termEnd', po.membership_end_date
          )
        FROM payment_overview po
        WHERE po.id = ${id}
      `,
      sql`DELETE FROM payments WHERE id = ${id} RETURNING id`,
    ]);
    return deleted.length > 0;
  });
}
