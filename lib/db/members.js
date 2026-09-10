import "server-only";

import { sql, query, toId, DatabaseError } from "@/lib/db";
import { EXPIRING_SOON_DAYS } from "@/lib/config";
import { today } from "@/lib/utils/dates";
import { normalizeMemberFilter } from "@/lib/utils/membershipStatus";

/**
 * Member queries.
 *
 * Reads come from the `member_overview` view, which pairs each member with
 * their current membership. Writes touch `members` and `memberships`
 * together, so both are done atomically.
 *
 * Nothing here decides whether a membership is Active or Expired - that is
 * derived in lib/utils/membershipStatus.js from the end date these queries
 * return.
 */

/**
 * All members with their current membership, newest joiners first.
 *
 * @param {object} options
 * @param {string} [options.search] matches name, phone or email
 * @param {string} [options.status] one of the MEMBER_FILTERS values
 *
 * Both the search term and the status are passed as parameters and tested
 * inside the WHERE clause, rather than being pasted into the query text. One
 * query covers every combination and no user input is ever read as SQL.
 *
 * The status rules here are the same comparisons that
 * lib/utils/membershipStatus.js makes in JavaScript, against the same date and
 * the same window, so a filtered list always agrees with the badges in it.
 */
export async function getMembers({ search, status } = {}) {
  const term = search?.trim() ? `%${search.trim()}%` : null;
  const filter = normalizeMemberFilter(status);
  const referenceDate = today();

  return query("load members", async () => {
    return sql`
      SELECT
        id,
        first_name,
        last_name,
        full_name,
        phone,
        email,
        gender,
        join_date,
        -- The membership columns are needed by the payment form, which has to
        -- know which term a payment would attach to and what plan it is on.
        membership_id,
        membership_plan_id,
        plan_name,
        membership_start_date,
        membership_end_date,
        membership_price,
        membership_amount_paid
      FROM member_overview
      WHERE (
              ${term}::text IS NULL
              OR full_name ILIKE ${term}
              OR phone ILIKE ${term}
              OR email ILIKE ${term}
            )
        AND (
              ${filter}::text = 'all'
              OR (
                ${filter}::text = 'active'
                AND membership_end_date >= ${referenceDate}::date
              )
              OR (
                ${filter}::text = 'expiring'
                AND membership_end_date >= ${referenceDate}::date
                AND membership_end_date <= ${referenceDate}::date + ${EXPIRING_SOON_DAYS}::int
              )
              OR (
                ${filter}::text = 'expired'
                AND membership_end_date < ${referenceDate}::date
              )
            )
      ORDER BY join_date DESC, id DESC
    `;
  });
}

/**
 * How many members each filter would show, for the counts on the filter tabs.
 *
 * The current search is applied first, so the numbers describe what clicking
 * each tab would actually give you rather than the whole database.
 *
 * FILTER clauses mean one scan produces all four counts.
 */
export async function getMemberStatusCounts({ search } = {}) {
  const term = search?.trim() ? `%${search.trim()}%` : null;
  const referenceDate = today();

  return query("count members by status", async () => {
    const [counts] = await sql`
      SELECT
        count(*)::int AS all,

        count(*) FILTER (
          WHERE membership_end_date >= ${referenceDate}::date
        )::int AS active,

        count(*) FILTER (
          WHERE membership_end_date >= ${referenceDate}::date
            AND membership_end_date <= ${referenceDate}::date + ${EXPIRING_SOON_DAYS}::int
        )::int AS expiring,

        count(*) FILTER (
          WHERE membership_end_date < ${referenceDate}::date
        )::int AS expired
      FROM member_overview
      WHERE ${term}::text IS NULL
         OR full_name ILIKE ${term}
         OR phone ILIKE ${term}
         OR email ILIKE ${term}
    `;
    return counts;
  });
}

/** One member with their current membership, or null when the id is unknown. */
export async function getMemberById(id) {
  const memberId = toId(id);
  if (!memberId) return null;

  return query("load the member", async () => {
    const [member] = await sql`
      SELECT *
      FROM member_overview
      WHERE id = ${memberId}
    `;
    return member ?? null;
  });
}

/**
 * Creates a member and their first membership.
 *
 * Both rows are written by a single statement, which makes them atomic - there
 * is no way to end up with a member who has no membership.
 *
 * Note the shape: the chosen plan is selected first, and the member INSERT
 * reads FROM that result. If the plan does not exist the plan CTE is empty, so
 * the member is never inserted either. Writing it the other way round - member
 * first, then joining to the plan - would leave an orphaned member behind
 * whenever the plan had been deleted, because a data-modifying CTE runs
 * whether or not the outer query uses its output.
 *
 * The price is copied from the plan as it stands today. Later price changes
 * must not rewrite what this member was charged.
 *
 * @returns {Promise<number>} the new member's id
 */
export async function createMember(data) {
  return query("create the member", async () => {
    const [row] = await sql`
      WITH plan AS (
        SELECT id, price
        FROM membership_plans
        WHERE id = ${data.membershipPlanId}
      ),
      new_member AS (
        INSERT INTO members (
          first_name, last_name, phone, email, gender, date_of_birth, address,
          emergency_contact_name, emergency_contact_phone, notes, join_date
        )
        SELECT
          ${data.firstName}, ${data.lastName}, ${data.phone}, ${data.email},
          ${data.gender}, ${data.dateOfBirth}::date, ${data.address},
          ${data.emergencyContactName}, ${data.emergencyContactPhone},
          ${data.notes}, ${data.joinDate}::date
        FROM plan
        RETURNING id
      )
      INSERT INTO memberships (
        member_id, membership_plan_id, start_date, end_date, price
      )
      SELECT
        new_member.id,
        plan.id,
        ${data.membershipStartDate}::date,
        ${data.membershipEndDate}::date,
        plan.price
      FROM new_member
      CROSS JOIN plan
      RETURNING member_id
    `;

    if (!row) {
      // Nothing was written, which can only mean the plan CTE found no plan.
      throw new DatabaseError("The selected membership plan no longer exists.");
    }
    return row.member_id;
  });
}

/**
 * Updates a member's details and their current membership term.
 *
 * Editing corrects the existing term rather than starting a new one - a member
 * who buys another term gets a new `memberships` row, which is what the future
 * Renew action will do.
 *
 * The three statements run in one transaction so a half-applied edit is
 * impossible. The INSERT only fires for a member with no current term at all,
 * which happens when their only terms were cancelled. It selects FROM members
 * rather than naming the id directly, so an id that matches nobody inserts
 * nothing - otherwise it would try to attach a membership to a member who does
 * not exist and trip the foreign key.
 *
 * @returns {Promise<boolean>} false when no member has that id
 */
export async function updateMember(id, data) {
  const memberId = toId(id);
  if (!memberId) return false;

  return query("update the member", async () => {
    const [updatedMember] = await sql.transaction([
      sql`
        UPDATE members SET
          first_name = ${data.firstName},
          last_name = ${data.lastName},
          phone = ${data.phone},
          email = ${data.email},
          gender = ${data.gender},
          date_of_birth = ${data.dateOfBirth},
          address = ${data.address},
          emergency_contact_name = ${data.emergencyContactName},
          emergency_contact_phone = ${data.emergencyContactPhone},
          notes = ${data.notes},
          join_date = ${data.joinDate}
        WHERE id = ${memberId}
        RETURNING id
      `,
      sql`
        UPDATE memberships SET
          membership_plan_id = ${data.membershipPlanId},
          start_date = ${data.membershipStartDate},
          end_date = ${data.membershipEndDate}
        WHERE id = (
          SELECT ms.id
          FROM memberships ms
          WHERE ms.member_id = ${memberId}
            AND ms.status <> 'cancelled'
          ORDER BY ms.end_date DESC, ms.id DESC
          LIMIT 1
        )
      `,
      sql`
        INSERT INTO memberships (
          member_id, membership_plan_id, start_date, end_date, price
        )
        SELECT
          m.id, ${data.membershipPlanId},
          ${data.membershipStartDate}, ${data.membershipEndDate}, p.price
        FROM members m
        JOIN membership_plans p ON p.id = ${data.membershipPlanId}
        WHERE m.id = ${memberId}
          AND NOT EXISTS (
            SELECT 1 FROM memberships
            WHERE member_id = m.id AND status <> 'cancelled'
          )
      `,
    ]);

    return updatedMember.length > 0;
  });
}

/**
 * Deletes a member. Their memberships go with them through ON DELETE CASCADE.
 *
 * @returns {Promise<boolean>} false when no member has that id
 */
export async function deleteMember(id) {
  const memberId = toId(id);
  if (!memberId) return false;

  return query("delete the member", async () => {
    const deleted = await sql`DELETE FROM members WHERE id = ${memberId} RETURNING id`;
    return deleted.length > 0;
  });
}
