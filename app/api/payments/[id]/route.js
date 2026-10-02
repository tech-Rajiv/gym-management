import { ok, notFound, withAdmin } from "@/lib/api";
import { deletePayment } from "@/lib/db/payments";
import { toId } from "@/lib/db";

/**
 * DELETE /api/payments/:id
 *
 * Removes a mistyped payment record. A full copy of it is kept in the audit
 * log, and the membership term it paid for is left alone - the term simply
 * reads as Unpaid again.
 */
export const DELETE = withAdmin(async (_request, { params }, admin) => {
  const { id } = await params;
  const paymentId = toId(id);
  if (!paymentId) return notFound("That payment could not be identified.");

  const deleted = await deletePayment(paymentId, admin);
  return deleted
    ? ok({ id: paymentId })
    : notFound("That payment no longer exists. It may already have been deleted.");
});
