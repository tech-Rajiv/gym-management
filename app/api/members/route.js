import { ok, fail, readJson, withAdmin, memberWriteError } from "@/lib/api";
import { createMember, getMemberById } from "@/lib/db/members";
import { getPaymentById } from "@/lib/db/payments";
import {
  parseMemberForm,
  validateMember,
  validateJoiningPayment,
} from "@/lib/validations/member";

/**
 * POST /api/members   the Add Member form's fields
 *
 * Adds a member together with their first membership term and the payment
 * they made for it - a member joins by paying, so both are recorded at once,
 * in one statement. The payment is the plan's full price, taken from the plan
 * on the server; the form sends only how and when it was paid. Answers with what was saved, for the success popup.
 *
 *     form  ->  API route  ->  validation  ->  repository  ->  PostgreSQL
 */
export const POST = withAdmin(async (request, _context, admin) => {
  const body = await readJson(request);
  if (!body) return fail({ message: "The form could not be read. Please try again." });

  const member = validateMember(parseMemberForm(body));
  const payment = validateJoiningPayment(body);

  // Both halves are checked before anything is saved, so every problem on
  // the form is reported in one go.
  if (!member.valid || !payment.valid) {
    return fail({ errors: { ...member.errors, ...payment.errors } });
  }

  let created;
  try {
    created = await createMember(member.values, admin, payment.values);
  } catch (error) {
    return memberWriteError(error);
  }

  // Read back from the database, so the popup shows what was really stored.
  const [saved, receipt] = await Promise.all([
    getMemberById(created.memberId),
    created.paymentId ? getPaymentById(created.paymentId) : null,
  ]);

  return ok(
    {
      id: created.memberId,
      member: {
        fullName: saved?.full_name,
        phone: saved?.phone,
        plan: saved?.plan_name,
        termStart: saved?.membership_start_date,
        termEnd: saved?.membership_end_date,
        price: saved?.membership_price,
      },
      payment: {
        amount: receipt?.amount,
        method: receipt?.method,
        paidOn: receipt?.paid_on,
        reference: receipt?.reference,
      },
    },
    201
  );
});
