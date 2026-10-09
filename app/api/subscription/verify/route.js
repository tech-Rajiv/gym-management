import { createHmac, timingSafeEqual } from "node:crypto";
import { fail, ok, readJson, withAdmin } from "@/lib/api";
import { settleSubscriptionPayment } from "@/lib/subscription/settle";

/**
 * POST /api/subscription/verify
 *   { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *
 * Checks Razorpay's signature, confirms the order belongs to this gym, then
 * extends cover by one period from today or from the current end date,
 * whichever is later.
 */
export const POST = withAdmin(async (request, _context, admin) => {
  const keySecret = process.env.LIVE_SECRET_KEY;
  const keyId = process.env.LIVE_API_KEY;
  if (!keyId || !keySecret) return fail({ message: "Payments are not configured yet." }, 500);

  const body = await readJson(request);
  const orderId = body?.razorpay_order_id;
  const paymentId = body?.razorpay_payment_id;
  const signature = body?.razorpay_signature;
  if (!orderId || !paymentId || !signature) {
    return fail({ message: "The payment could not be confirmed." }, 400);
  }

  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signature);
  if (expectedBuf.length !== givenBuf.length || !timingSafeEqual(expectedBuf, givenBuf)) {
    return fail({ message: "The payment could not be confirmed." }, 400);
  }

  const settled = await settleSubscriptionPayment({
    orderId,
    paymentId,
    expectedGymId: admin.gymId,
  });
  if (!settled.ok) return fail({ message: settled.message }, settled.status);

  return ok({ paidUntil: settled.paidUntil });
});
