import { ok, fail, readJson, withAdmin } from "@/lib/api";
import {
  createPayment,
  createPaymentWithMembership,
  getPaymentById,
} from "@/lib/db/payments";
import { validatePayment } from "@/lib/validations/payment";
import { getMembershipPlanById } from "@/lib/db/plans";

/**
 * POST /api/payments   the Record Payment form's fields
 *
 * Two things can happen, depending on what the payment is for:
 *
 *   * an existing term - only the payment is written;
 *   * a new term       - the term and the payment are written together, which
 *                        is how a renewal gets recorded.
 *
 * Either way the audit log entry is written in the same statement.
 */
export const POST = withAdmin(async (request, _context, admin) => {
  const body = await readJson(request);
  if (!body) return fail({ message: "The form could not be read. Please try again." });

  const { valid, errors, data } = validatePayment(body);
  if (!valid) {
    return fail({ message: "Please correct the highlighted fields.", errors });
  }

  // A new term is charged at its plan's current price, taken from the
  // database rather than the request, so it cannot be altered in the browser.
  if (data.isNewTerm) {
    const plan = await getMembershipPlanById(data.membershipPlanId);
    if (!plan || !plan.is_active) {
      return fail({
        message: "Please correct the highlighted fields.",
        errors: { membershipPlanId: "That plan is no longer on sale. Choose another." },
      });
    }
    data.termPrice = plan.price;
  }

  try {
    const result = data.isNewTerm
      ? await createPaymentWithMembership(data, admin)
      : { paymentId: await createPayment(data, admin) };

    // What was saved, read back from the database, for the success popup.
    const receipt = await getPaymentById(result.paymentId);
    return ok({ id: result.paymentId, memberId: data.memberId, receipt }, 201);
  } catch (error) {
    return fail(
      { message: error?.message ?? "Could not record the payment. Please try again in a moment." },
      500
    );
  }
});
