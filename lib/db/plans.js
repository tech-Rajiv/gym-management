import "server-only";

import { sql, query, requireGymId } from "@/lib/db";
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
export async function getMembershipPlans(gymId) {
  const tenantId = requireGymId(gymId);
  return query("load membership plans", async () => {
    return sql`
      SELECT id, name, description, duration_days, price, includes_cardio
      FROM membership_plans
      WHERE is_active = true AND gym_id = ${tenantId}
      ORDER BY duration_days ASC
    `;
  });
}

/** A single plan, or null when the id does not exist in this gym. */
export async function getMembershipPlanById(id, gymId) {
  const tenantId = requireGymId(gymId);
  return query("load the membership plan", async () => {
    const [plan] = await sql`
      SELECT id, name, description, duration_days, price, includes_cardio, is_active
      FROM membership_plans
      WHERE id = ${id} AND gym_id = ${tenantId}
    `;
    return plan ?? null;
  });
}

/**
 * The plans on sale, each with how many members are on it and the first
 * names of the most recent few - for the Plans page cards ("Aushi, Rahul +6
 * more"). A member is "on" a plan when their latest term is of that plan and
 * they have not left the gym.
 */
export async function getPlansWithUsage(gymId) {
  const tenantId = requireGymId(gymId);
  return query("load membership plans", async () => {
    return sql`
      SELECT
        p.id, p.name, p.description, p.duration_days, p.price, p.includes_cardio,
        count(mo.id) FILTER (WHERE mo.member_status = 'active')::int AS member_count,
        (array_agg(mo.first_name ORDER BY mo.membership_start_date DESC, mo.id DESC)
          FILTER (WHERE mo.member_status = 'active'))[1:2] AS member_names,
        -- The same two members' ids and photos, for their avatars.
        (array_agg(json_build_object('id', mo.id, 'photo', mo.photo_url, 'gender', mo.gender)
          ORDER BY mo.membership_start_date DESC, mo.id DESC)
          FILTER (WHERE mo.member_status = 'active'))[1:2] AS member_avatars
      FROM membership_plans p
      LEFT JOIN member_overview mo
        ON mo.membership_plan_id = p.id AND mo.gym_id = p.gym_id
      WHERE p.is_active = true AND p.gym_id = ${tenantId}
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
  const gymId = requireGymId(actor.gymId);
  return query("create the plan", async () => {
    const [row] = await sql`
      WITH new_plan AS (
        INSERT INTO membership_plans (name, description, duration_days, price, includes_cardio, gym_id)
        VALUES (${data.name}, ${data.description}, ${data.durationDays}, ${data.price}, ${data.includesCardio}, ${gymId})
        RETURNING *
      ),
      logged AS (
        INSERT INTO audit_logs (
          admin_id, admin_name, action, entity_type, entity_id, entity_label, details, gym_id
        )
        SELECT
          ${actor.id}, ${actor.name}, 'create', 'plan', id, name,
          jsonb_build_object('durationDays', duration_days, 'price', price, 'includesCardio', includes_cardio),
          ${gymId}
        FROM new_plan
      )
      SELECT id FROM new_plan
    `;
    return row.id;
  });
}

/**
 * Changes a plan's name, length, price or cardio, and logs exactly what changed.
 *
 * Members already on the plan are unaffected: every term keeps the price it
 * was sold at (memberships.price). A new price applies from the next payment.
 *
 * @param {object[]} changes from diffPlan, worked out by the API route
 * @returns {Promise<boolean>} false when no plan on sale has that id
 */
export async function updatePlan(id, data, actor, changes) {
  const gymId = requireGymId(actor.gymId);
  return query("update the plan", async () => {
    const [updated] = await sql.transaction([
      sql`
        UPDATE membership_plans SET
          name = ${data.name},
          description = ${data.description},
          duration_days = ${data.durationDays},
          price = ${data.price},
          includes_cardio = ${data.includesCardio}
        WHERE id = ${id} AND is_active = true AND gym_id = ${gymId}
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
  const gymId = requireGymId(actor.gymId);
  return query("delete the plan", async () => {
    const [, retired] = await sql.transaction([
      sql`
        INSERT INTO audit_logs (
          admin_id, admin_name, action, entity_type, entity_id, entity_label, details, gym_id
        )
        SELECT
          ${actor.id}, ${actor.name}, 'delete', 'plan', id, name,
          jsonb_build_object('durationDays', duration_days, 'price', price, 'includesCardio', includes_cardio),
          ${gymId}
        FROM membership_plans
        WHERE id = ${id} AND is_active = true AND gym_id = ${gymId}
      `,
      sql`
        UPDATE membership_plans SET is_active = false
        WHERE id = ${id} AND is_active = true AND gym_id = ${gymId}
        RETURNING id
      `,
    ]);
    return retired.length > 0;
  });
}
