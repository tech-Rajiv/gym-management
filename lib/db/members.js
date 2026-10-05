import "server-only";

import { sql, query, toId, DatabaseError } from "@/lib/db";
import { auditEntry } from "@/lib/db/audit";
import { EXPIRING_SOON_DAYS, GYM_TIMEZONE } from "@/lib/config";
import { today, startOfMonth } from "@/lib/utils/dates";
import { normalizeMemberFilter } from "@/lib/utils/membershipStatus";
import {
  diffMember,
  memberSnapshotFromRow,
  memberSnapshotFromValues,
} from "@/lib/utils/auditLog";

/**
 * Member queries.
 *
 * Reads come from the `member_overview` view, which pairs each member with
 * their current membership. Writes touch `members` and `memberships`
 * together, so both are done atomically.
 *
 * Members are never deleted. Someone who stops coming is marked 'left'
 * (members.status), which hides them from the everyday lists while keeping
 * their record and payment history. Every list below therefore asks for
 * `member_status = 'active'` unless it is the Left list itself.
 *
 * Every write takes the admin making it (`actor`) and records an audit log
 * entry in the same statement or transaction - see lib/db/audit.js.
 *
 * Nothing here decides whether a membership is Active or Expired - that is
 * derived in lib/utils/membershipStatus.js from the end date these queries
 * return.
 */

/**
 * Members with their current membership, newest joiners first.
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
  const monthStart = startOfMonth(referenceDate);

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
        member_status,
        -- The day they left, as a calendar date in the gym's timezone.
        (left_at AT TIME ZONE ${GYM_TIMEZONE})::date AS left_on,
        -- The membership columns are needed by the payment form, which has to
        -- know which term a payment would attach to and what plan it is on.
        membership_id,
        membership_plan_id,
        plan_name,
        membership_start_date,
        membership_end_date,
        membership_price,
        membership_amount_paid,
        last_paid_on,
        -- The most recent payment from this member, whatever term it was for:
        -- what the list's "Last payment" column shows.
        last_payment.amount  AS last_payment_amount,
        last_payment.paid_on AS last_payment_on,
        last_payment.method  AS last_payment_method
      FROM member_overview
      LEFT JOIN LATERAL (
        SELECT pay.amount, pay.paid_on, pay.method
        FROM payments pay
        WHERE pay.member_id = member_overview.id
        ORDER BY pay.paid_on DESC, pay.id DESC
        LIMIT 1
      ) last_payment ON true
      WHERE (
              ${term}::text IS NULL
              OR full_name ILIKE ${term}
              OR phone ILIKE ${term}
              OR email ILIKE ${term}
            )
        AND (
              (${filter}::text = 'left' AND member_status = 'left')
              OR (
                ${filter}::text <> 'left'
                AND member_status = 'active'
                AND (
                  ${filter}::text = 'all'
                  OR (
                    ${filter}::text = 'new'
                    AND join_date >= ${monthStart}::date
                    AND join_date <= ${referenceDate}::date
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
              )
            )
      ORDER BY
        -- The Left list reads best most-recently-left first.
        CASE WHEN ${filter}::text = 'left' THEN left_at END DESC NULLS LAST,
        join_date DESC,
        id DESC
    `;
  });
}

/**
 * How many members each filter would show, for the counts on the filter tabs.
 *
 * The current search is applied first, so the numbers describe what clicking
 * each tab would actually give you rather than the whole database.
 *
 * FILTER clauses mean one scan produces every count.
 */
export async function getMemberStatusCounts({ search } = {}) {
  const term = search?.trim() ? `%${search.trim()}%` : null;
  const referenceDate = today();
  const monthStart = startOfMonth(referenceDate);

  return query("count members by status", async () => {
    const [counts] = await sql`
      SELECT
        count(*) FILTER (WHERE member_status = 'active')::int AS all,

        count(*) FILTER (
          WHERE member_status = 'active'
            AND join_date >= ${monthStart}::date
            AND join_date <= ${referenceDate}::date
        )::int AS new,

        count(*) FILTER (
          WHERE member_status = 'active'
            AND membership_end_date >= ${referenceDate}::date
            AND membership_end_date <= ${referenceDate}::date + ${EXPIRING_SOON_DAYS}::int
        )::int AS expiring,

        count(*) FILTER (
          WHERE member_status = 'active'
            AND membership_end_date < ${referenceDate}::date
        )::int AS expired,

        count(*) FILTER (WHERE member_status = 'left')::int AS left
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
      SELECT *, (left_at AT TIME ZONE ${GYM_TIMEZONE})::date AS left_on
      FROM member_overview
      WHERE id = ${memberId}
    `;
    return member ?? null;
  });
}

/**
 * Adds a member: the person, their first membership term, and the payment
 * they made for it, with both log entries - all in one SQL statement, so
 * either everything is saved or nothing is. There is no way to end up with a
 * member who has no membership, or a joining payment that was never recorded.
 *
 * Note the shape: the chosen plan is selected first, and the member INSERT
 * reads FROM that result. If the plan does not exist (or is no longer on
 * sale) the plan CTE is empty, so nothing is inserted at all. Writing it the
 * other way round would leave an orphaned member behind, because a
 * data-modifying CTE runs whether or not the outer query uses its output.
 *
 * The term's price is copied from the plan as it stands today. Later price
 * changes must not rewrite what this member was charged.
 *
 * @param {object} data    validated member values
 * @param {object} payment validated joining payment: method, paidOn,
 *                         reference. There is no amount: the gym takes no
 *                         part payments, so the payment is the term's full
 *                         price - the plan's price, copied onto the term. A
 *                         free (zero-price) plan records no payment at all.
 * @returns {Promise<{memberId: number, paymentId: number|null}>}
 */
export async function createMember(data, actor, payment) {
  return query("create the member", async () => {
    const [row] = await sql`
      WITH plan AS (
        SELECT id, name, price
        FROM membership_plans
        WHERE id = ${data.membershipPlanId} AND is_active
      ),
      new_member AS (
        INSERT INTO members (
          first_name, last_name, phone, email, gender, date_of_birth, address,
          notes, join_date
        )
        SELECT
          ${data.firstName}, ${data.lastName}, ${data.phone}, ${data.email},
          ${data.gender}, ${data.dateOfBirth}::date, ${data.address},
          ${data.notes}, ${data.joinDate}::date
        FROM plan
        RETURNING id, first_name || ' ' || last_name AS full_name
      ),
      new_membership AS (
        INSERT INTO memberships (
          member_id, membership_plan_id, start_date, end_date, price
        )
        SELECT
          new_member.id, plan.id,
          ${data.membershipStartDate}::date, ${data.membershipEndDate}::date,
          plan.price
        FROM new_member
        CROSS JOIN plan
        RETURNING *
      ),
      new_payment AS (
        INSERT INTO payments (
          member_id, membership_id, amount, method, paid_on, reference
        )
        SELECT
          member_id, id, price, ${payment.method},
          ${payment.paidOn}::date, ${payment.reference}
        FROM new_membership
        WHERE price > 0
        RETURNING *
      ),
      logged_member AS (
        INSERT INTO audit_logs (
          admin_id, admin_name, action, entity_type, entity_id, entity_label, details
        )
        SELECT
          ${actor.id}, ${actor.name}, 'create', 'member', new_member.id,
          new_member.full_name,
          jsonb_build_object(
            'phone', ${data.phone}::text,
            'plan', plan.name,
            'termStart', ${data.membershipStartDate}::text,
            'termEnd', ${data.membershipEndDate}::text
          )
        FROM new_member
        CROSS JOIN plan
      ),
      logged_payment AS (
        INSERT INTO audit_logs (
          admin_id, admin_name, action, entity_type, entity_id, entity_label, details
        )
        SELECT
          ${actor.id}, ${actor.name}, 'create', 'payment', np.id,
          new_member.full_name,
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
        JOIN new_member ON new_member.id = np.member_id
        CROSS JOIN plan
      )
      SELECT new_membership.member_id, new_payment.id AS payment_id
      FROM new_membership
      LEFT JOIN new_payment ON new_payment.membership_id = new_membership.id
    `;

    if (!row) {
      // Nothing was written, which can only mean the plan CTE found no plan.
      throw new DatabaseError("The selected membership plan is no longer on sale.");
    }
    return { memberId: row.member_id, paymentId: row.payment_id };
  });
}

/**
 * Updates a member's details and their current membership term, and logs
 * exactly which fields changed.
 *
 * Editing corrects the existing term rather than starting a new one - a member
 * who buys another term gets a new `memberships` row, which is what recording
 * a renewal payment does.
 *
 * The member is read first so the log can say "Phone: A → B" rather than just
 * "edited". The writes then run in one transaction, log included, so a
 * half-applied edit is impossible. The INSERT only fires for a member with no
 * current term at all, which happens when their only terms were cancelled. It
 * selects FROM members rather than naming the id directly, so an id that
 * matches nobody inserts nothing.
 *
 * @param {string} planName the chosen plan's name, for the change log
 * @returns {Promise<boolean>} false when no member has that id
 */
export async function updateMember(id, data, actor, planName) {
  const memberId = toId(id);
  if (!memberId) return false;

  const before = await getMemberById(memberId);
  if (!before) return false;

  const changes = diffMember(
    memberSnapshotFromRow(before),
    memberSnapshotFromValues(data, planName)
  );

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
      // Saving the form without changing anything is not worth a log entry.
      ...(changes.length > 0
        ? [
            auditEntry(actor, {
              action: "update",
              entityType: "member",
              entityId: memberId,
              entityLabel: `${data.firstName} ${data.lastName}`,
              details: { changes },
            }),
          ]
        : []),
    ]);

    return updatedMember.length > 0;
  });
}

/**
 * Sets a member's status - 'left' when they stop coming, 'active' when they
 * come back - and logs it. Nothing is deleted either way.
 *
 * The log INSERT runs first and only matches a member whose status is actually
 * changing, so a repeated click neither logs twice nor reports success twice.
 *
 * @returns {Promise<boolean>} false when the member does not exist or already
 *                             has that status
 */
async function setMemberStatus(id, status, actor) {
  const memberId = toId(id);
  if (!memberId) return false;

  const action = status === "left" ? "left" : "restore";

  return query(status === "left" ? "mark the member as left" : "restore the member", async () => {
    const [, updated] = await sql.transaction([
      sql`
        INSERT INTO audit_logs (
          admin_id, admin_name, action, entity_type, entity_id, entity_label
        )
        SELECT
          ${actor.id}, ${actor.name}, ${action}, 'member', id,
          first_name || ' ' || last_name
        FROM members
        WHERE id = ${memberId} AND status <> ${status}
      `,
      sql`
        UPDATE members SET
          status = ${status},
          left_at = CASE WHEN ${status}::text = 'left' THEN now() END
        WHERE id = ${memberId} AND status <> ${status}
        RETURNING id
      `,
    ]);
    return updated.length > 0;
  });
}

/** Marks a member as having left the gym. Their data is kept. */
export function markMemberLeft(id, actor) {
  return setMemberStatus(id, "left", actor);
}

/** Brings a member who left back onto the active list. */
export function restoreMember(id, actor) {
  return setMemberStatus(id, "active", actor);
}
