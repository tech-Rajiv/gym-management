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
        FROM admins
        WHERE gym_id = g.id
        ORDER BY id
        LIMIT 1
      ) owner ON true
      LEFT JOIN saas_subscriptions s ON s.gym_id = g.id
      ORDER BY g.id
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
      SELECT 1 AS taken FROM founders WHERE lower(email) = lower(${email})
      UNION ALL
      SELECT 1 FROM admins WHERE lower(email) = lower(${email})
      LIMIT 1
    `;
    if (taken) {
      const duplicate = new DatabaseError("An account with this email already exists.");
      duplicate.cause = { code: "23505", constraint: "admins_email_key" };
      throw duplicate;
    }

    const [gym] = await sql`
      WITH new_gym AS (
        INSERT INTO gyms (name)
        VALUES (${name})
        RETURNING id, name
      ),
      new_admin AS (
        INSERT INTO admins (name, email, password, gym_id)
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
      WITH payment AS (
        INSERT INTO saas_payments (
          gym_id, amount, paid_on, covered_until, razorpay_order_id, razorpay_payment_id
        )
        VALUES (
          ${gymId}, ${amount}, ${paidOn}::date, ${coveredUntil}::date, ${orderId}, ${paymentId}
        )
        ON CONFLICT (razorpay_payment_id) DO NOTHING
        RETURNING id
      ),
      updated AS (
        UPDATE saas_subscriptions
        SET status = 'paid', paid_until = ${coveredUntil}::date
        WHERE gym_id = ${gymId}
          AND EXISTS (SELECT 1 FROM payment)
        RETURNING paid_until
      )
      SELECT paid_until FROM updated
      UNION ALL
      SELECT paid_until FROM saas_subscriptions
      WHERE gym_id = ${gymId}
        AND NOT EXISTS (SELECT 1 FROM payment)
    `;
    return row?.paid_until ?? null;
  });
}
