import "server-only";

import { sql, query, DatabaseError } from "@/lib/db";

/**
 * The gyms a founder manages.
 *
 * This is the SaaS side: which gyms exist, who owns them, how many members
 * they have, and whether that gym has paid for the software. Member fees
 * live in `payments` and are not counted here.
 */

/**
 * This gym's software subscription, or null when no row exists yet.
 * The caller decides paid / expiring / ended from status and paid_until.
 */
export async function getGymSubscription(gymId) {
  return query("load the gym subscription", async () => {
    const [row] = await sql`
      SELECT status, paid_until
      FROM saas_subscriptions
      WHERE gym_id = ${gymId}
    `;
    return row ?? null;
  });
}

/** Every gym, oldest first, with its owner, member count and subscription. */
export async function listGyms() {
  return query("load gyms", async () => {
    return sql`
      SELECT
        g.id,
        g.name,
        owner.name AS owner_name,
        owner.email AS owner_email,
        (SELECT count(*)::int FROM members m WHERE m.gym_id = g.id) AS member_count,
        COALESCE(s.status, 'unpaid') AS subscription_status,
        s.paid_until
      FROM gyms g
      LEFT JOIN LATERAL (
        SELECT name, email
        FROM owners
        WHERE gym_id = g.id
        ORDER BY id
        LIMIT 1
      ) owner ON true
      LEFT JOIN saas_subscriptions s ON s.gym_id = g.id
      ORDER BY g.id
    `;
  });
}

/** One gym for the operator's detail page, or null. */
export async function getFounderGym(gymId) {
  return query("load the gym", async () => {
    const [gym] = await sql`
      SELECT
        g.id,
        g.name,
        owner.name AS owner_name,
        owner.email AS owner_email,
        (SELECT count(*)::int FROM members m WHERE m.gym_id = g.id) AS member_count,
        COALESCE(s.status, 'unpaid') AS subscription_status,
        s.paid_until
      FROM gyms g
      LEFT JOIN LATERAL (
        SELECT name, email
        FROM owners
        WHERE gym_id = g.id
        ORDER BY id
        LIMIT 1
      ) owner ON true
      LEFT JOIN saas_subscriptions s ON s.gym_id = g.id
      WHERE g.id = ${gymId}
    `;
    return gym ?? null;
  });
}

/** Software payments for one gym, oldest first. Member fees are not included. */
export async function listSubscriptionPayments(gymId) {
  return query("load subscription payments", async () => {
    return sql`
      SELECT
        id,
        gym_id,
        amount,
        paid_on,
        covered_until,
        razorpay_order_id,
        razorpay_payment_id
      FROM saas_payments
      WHERE gym_id = ${gymId}
      ORDER BY paid_on, id
    `;
  });
}

/** Every software payment, so the gym list can show what has been collected. */
export async function listAllSubscriptionPayments() {
  return query("load all subscription payments", async () => {
    return sql`
      SELECT id, gym_id, amount, paid_on, covered_until
      FROM saas_payments
      ORDER BY paid_on, id
    `;
  });
}

/**
 * Creates a gym, its owner login, and an unpaid subscription, together.
 *
 * The owner email has to be new among both gym owners and the founder.
 * The password is stored the same way gym owner passwords already are.
 *
 * @returns {Promise<{id: number, name: string, ownerEmail: string}>}
 */
export async function createGym({ name, ownerName, email, password }) {
  return query("create the gym", async () => {
    const [taken] = await sql`
      SELECT 1 AS taken FROM operators WHERE lower(email) = lower(${email})
      UNION ALL
      SELECT 1 FROM owners WHERE lower(email) = lower(${email})
      LIMIT 1
    `;
    if (taken) {
      const duplicate = new DatabaseError("An account with this email already exists.");
      duplicate.cause = { code: "23505", constraint: "owners_email_key" };
      throw duplicate;
    }

    const [gym] = await sql`
      WITH new_gym AS (
        INSERT INTO gyms (name)
        VALUES (${name})
        RETURNING id, name
      ),
      new_admin AS (
        INSERT INTO owners (name, email, password, gym_id)
        SELECT ${ownerName}, ${email}, ${password}, id
        FROM new_gym
      ),
      new_subscription AS (
        INSERT INTO saas_subscriptions (gym_id, status)
        SELECT id, 'unpaid' FROM new_gym
      )
      SELECT id, name FROM new_gym
    `;

    return { id: gym.id, name: gym.name, ownerEmail: email };
  });
}

/**
 * Records a software payment and moves this gym's cover date forward.
 * The same Razorpay payment cannot be applied twice.
 *
 * Uses INSERT … ON CONFLICT for the subscription row: an UPDATE alone would
 * leave the gym unpaid when no saas_subscriptions row exists yet (for
 * example a gym created before that insert was added, or a missing row).
 * Replaying the same Razorpay payment still syncs cover from the stored row.
 *
 * @returns {Promise<string|null>} the cover date now stored, "YYYY-MM-DD"
 */
export async function recordSubscriptionPayment({
  gymId,
  amount,
  paidOn,
  coveredUntil,
  orderId,
  paymentId,
}) {
  return query("record the subscription payment", async () => {
    const [row] = await sql`
      WITH inserted AS (
        INSERT INTO saas_payments (
          gym_id, amount, paid_on, covered_until, razorpay_order_id, razorpay_payment_id
        )
        VALUES (
          ${gymId}, ${amount}, ${paidOn}::date, ${coveredUntil}::date, ${orderId}, ${paymentId}
        )
        ON CONFLICT (razorpay_payment_id) DO NOTHING
        RETURNING gym_id, covered_until
      ),
      applied AS (
        SELECT gym_id, covered_until FROM inserted
        UNION ALL
        SELECT gym_id, covered_until
        FROM saas_payments
        WHERE razorpay_payment_id = ${paymentId}
          AND NOT EXISTS (SELECT 1 FROM inserted)
      ),
      synced AS (
        INSERT INTO saas_subscriptions (gym_id, status, paid_until)
        SELECT gym_id, 'paid', covered_until FROM applied
        ON CONFLICT (gym_id) DO UPDATE
        SET
          status = 'paid',
          paid_until = GREATEST(
            COALESCE(saas_subscriptions.paid_until, '-infinity'::date),
            EXCLUDED.paid_until
          )
        RETURNING paid_until
      )
      SELECT paid_until FROM synced
    `;
    return row?.paid_until ?? null;
  });
}
