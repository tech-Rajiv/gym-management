import "server-only";

import { sql, query } from "@/lib/db";

/**
 * Membership plan queries.
 *
 * Plans are read often and change rarely, so everything here is a plain
 * SELECT. Creating and editing plans will come with the Membership Plans
 * module; for now they are managed through the seed file.
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
