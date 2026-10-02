import "server-only";

import { sql, query } from "@/lib/db";
import { auditEntry } from "@/lib/db/audit";

/**
 * Membership plan queries.
 *
 * Plans are managed on the Plans page. They are never deleted: a plan that
 * has been sold is referenced by members' terms, so "deleting" one takes it
 * off sale (is_active = false) and the terms keep pointing at it. Every write
 * is logged in the same statement or transaction.
 */

/**
 * Plans the gym is currently selling, shortest term first.
 * Retired plans are left out so they cannot be picked for a new member,
 * while memberships that already reference them keep working.
 */
export async function getMembershipPlans() {
  return query("load membership plans", async () => {
    return sql`
      SELECT id, name, description, duration_days, price
      FROM membership_plans
      WHERE is_active = true
      ORDER BY duration_days ASC
    `;
  });
}

/** A single plan, or null when the id does not exist. */
export async function getMembershipPlanById(id) {
  return query("load the membership plan", async () => {
    const [plan] = await sql`
      SELECT id, name, description, duration_days, price, is_active
      FROM membership_plans
      WHERE id = ${id}
    `;
    return plan ?? null;
  });
}

/**
 * The plans on sale, each with how many current members are on it - for the
 * Plans page, where that number is what makes deleting a plan a considered act.
 */
export async function getPlansWithUsage() {
  return query("load membership plans", async () => {
    return sql`
      SELECT
        p.id, p.name, p.description, p.duration_days, p.price,
        count(mo.id) FILTER (WHERE mo.member_status = 'active')::int AS member_count
      FROM membership_plans p
      LEFT JOIN member_overview mo ON mo.membership_plan_id = p.id
      WHERE p.is_active = true
      GROUP BY p.id
      ORDER BY p.duration_days ASC, p.id ASC
    `;
  });
}

/**
 * Adds a plan, and logs it.
 *
 * @returns {Promise<number>} the new plan's id
 */
export async function createPlan(data, actor) {
  return query("create the plan", async () => {
    const [row] = await sql`
      WITH new_plan AS (
        INSERT INTO membership_plans (name, description, duration_days, price)
        VALUES (${data.name}, ${data.description}, ${data.durationDays}, ${data.price})
        RETURNING *
      ),
      logged AS (
        INSERT INTO audit_logs (
          admin_id, admin_name, action, entity_type, entity_id, entity_label, details
        )
        SELECT
          ${actor.id}, ${actor.name}, 'create', 'plan', id, name,
          jsonb_build_object('durationDays', duration_days, 'price', price)
        FROM new_plan
      )
      SELECT id FROM new_plan
    `;
    return row.id;
  });
}

/**
 * Changes a plan's name, length or price, and logs exactly what changed.
 *
 * Members already on the plan are unaffected: every term keeps the price it
 * was sold at (memberships.price). A new price applies from the next payment.
 *
 * @param {object[]} changes from diffPlan, worked out by the API route
 * @returns {Promise<boolean>} false when no plan on sale has that id
 */
export async function updatePlan(id, data, actor, changes) {
  return query("update the plan", async () => {
    const [updated] = await sql.transaction([
      sql`
        UPDATE membership_plans SET
          name = ${data.name},
          description = ${data.description},
          duration_days = ${data.durationDays},
          price = ${data.price}
        WHERE id = ${id} AND is_active = true
        RETURNING id
      `,
      ...(changes.length > 0
        ? [
            auditEntry(actor, {
              action: "update",
              entityType: "plan",
              entityId: id,
              entityLabel: data.name,
              details: { changes },
            }),
          ]
        : []),
    ]);
    return updated.length > 0;
  });
}

/**
 * "Deletes" a plan by taking it off sale, and logs it.
 *
 * The row stays, because terms already sold point at it - those members keep
 * their plan, history and price. It simply stops being offered for new
 * members and renewals.
 *
 * @returns {Promise<boolean>} false when no plan on sale has that id
 */
export async function retirePlan(id, actor) {
  return query("delete the plan", async () => {
    const [, retired] = await sql.transaction([
      sql`
        INSERT INTO audit_logs (
          admin_id, admin_name, action, entity_type, entity_id, entity_label, details
        )
        SELECT
          ${actor.id}, ${actor.name}, 'delete', 'plan', id, name,
          jsonb_build_object('durationDays', duration_days, 'price', price)
        FROM membership_plans
        WHERE id = ${id} AND is_active = true
      `,
      sql`
        UPDATE membership_plans SET is_active = false
        WHERE id = ${id} AND is_active = true
        RETURNING id
      `,
    ]);
    return retired.length > 0;
  });
}
