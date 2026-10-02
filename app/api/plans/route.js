import { ok, fail, readJson, withAdmin, planWriteError } from "@/lib/api";
import { createPlan } from "@/lib/db/plans";
import { validatePlan } from "@/lib/validations/plan";

/**
 * POST /api/plans   { name, durationDays, price, description? }
 *
 * Adds a membership plan. It is on sale - offered in the member and payment
 * forms - straight away.
 */
export const POST = withAdmin(async (request, _context, admin) => {
  const body = await readJson(request);
  if (!body) return fail({ message: "The form could not be read. Please try again." });

  const { valid, errors, values } = validatePlan(body);
  if (!valid) return fail({ errors });

  try {
    const id = await createPlan(values, admin);
    return ok({ id }, 201);
  } catch (error) {
    return planWriteError(error);
  }
});
