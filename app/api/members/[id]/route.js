import { ok, fail, notFound, readJson, withAdmin, memberWriteError } from "@/lib/api";
import { updateMember, markMemberLeft, getMemberById } from "@/lib/db/members";
import { getMembershipPlanById } from "@/lib/db/plans";
import { toId } from "@/lib/db";
import { parseMemberForm, validateMember } from "@/lib/validations/member";

/**
 * PATCH /api/members/:id   the Edit Member form's fields
 *
 * Updates a member's details and their current membership term. The audit
 * log records exactly which fields changed.
 */
export const PATCH = withAdmin(async (request, { params }, admin) => {
  const { id } = await params;
  const memberId = toId(id);
  if (!memberId) return notFound("That member could not be found.");

  const body = await readJson(request);
  if (!body) return fail({ message: "The form could not be read. Please try again." });

  const { valid, errors, values } = validateMember(parseMemberForm(body));
  if (!valid) return fail({ errors });

  // The plan's name is what the change log shows, rather than its id.
  const plan = await getMembershipPlanById(values.membershipPlanId);
  if (!plan) {
    return fail({ errors: { membershipPlanId: "The selected membership plan no longer exists." } });
  }

  try {
    const updated = await updateMember(memberId, values, admin, plan.name);
    if (!updated) return notFound("This member no longer exists.");
    return ok({ id: memberId });
  } catch (error) {
    return memberWriteError(error);
  }
});

/**
 * DELETE /api/members/:id
 *
 * Does not delete anything. It marks the member as having left the gym, which
 * takes them off the everyday lists while keeping their record, membership
 * history and payments. They can be restored from the Left filter.
 */
export const DELETE = withAdmin(async (_request, { params }, admin) => {
  const { id } = await params;
  const memberId = toId(id);
  if (!memberId) return notFound("That member could not be found.");

  const changed = await markMemberLeft(memberId, admin);
  if (changed) return ok({ id: memberId, status: "left" });

  const member = await getMemberById(memberId);
  return member
    ? fail({ message: "This member is already marked as left." }, 409)
    : notFound("This member no longer exists.");
});
