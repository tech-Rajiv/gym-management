import { ok, fail, notFound, readJson, withAdmin, planWriteError } from "@/lib/api";
import { getMembershipPlanById, updatePlan, retirePlan } from "@/lib/db/plans";
import { toId } from "@/lib/db";
import { validatePlan } from "@/lib/validations/plan";
import { diffPlan } from "@/lib/utils/auditLog";

/**
 * PATCH /api/plans/:id   { name, durationDays, price, description? }
 *
 * Edits a plan. A new price applies to payments from now on; terms already
 * sold keep the price they were sold at.
 */
export const PATCH = withAdmin(async (request, { params }, admin) => {
  const { id } = await params;
  const planId = toId(id);
  if (!planId) return notFound("That plan could not be found.");

  const body = await readJson(request);
  if (!body) return fail({ message: "The form could not be read. Please try again." });

  const { valid, errors, values } = validatePlan(body);
  if (!valid) return fail({ errors });

  const existing = await getMembershipPlanById(planId, admin.gymId);
  if (!existing || !existing.is_active) return notFound("This plan no longer exists.");

  try {
    const updated = await updatePlan(planId, values, admin, diffPlan(existing, values));
    return updated ? ok({ id: planId }) : notFound("This plan no longer exists.");
  } catch (error) {
    return planWriteError(error);
  }
});

/**
 * DELETE /api/plans/:id
 *
 * Takes the plan off sale. Members already on it keep it - their terms still
 * point at the plan - but it is no longer offered for new members or renewals.
 */
export const DELETE = withAdmin(async (_request, { params }, admin) => {
  const { id } = await params;
  const planId = toId(id);
  if (!planId) return notFound("That plan could not be found.");

  const retired = await retirePlan(planId, admin);
  return retired ? ok({ id: planId }) : notFound("This plan has already been deleted.");
});
