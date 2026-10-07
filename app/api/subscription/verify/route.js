import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";
import { fail, ok, readJson, withAdmin } from "@/lib/api";
import { SAAS_PERIOD_DAYS, SAAS_PRICE_RUPEES } from "@/lib/config";
import { getGymSubscription, recordSubscriptionPayment } from "@/lib/db/gyms";
import { addDays, daysBetween, today } from "@/lib/utils/dates";

/**
 * POST /api/subscription/verify
 *   { razorpay_order_id, razorpay_payment_id, razorpay_signature }
 *
 * Checks Razorpay's signature, confirms the order belongs to this gym, then
 * extends cover by one period from today or from the current end date,
 * whichever is later.
 */
export const POST = withAdmin(async (request, _context, admin) => {
  const keySecret = process.env.TEST_SECRET_KEY;
  const keyId = process.env.TEST_API_KEY;
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

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const order = await razorpay.orders.fetch(orderId);
  const amountPaise = SAAS_PRICE_RUPEES * 100;
  if (String(order?.notes?.gymId) !== String(admin.gymId) || Number(order?.amount) !== amountPaise) {
    return fail({ message: "That payment does not belong to this gym." }, 400);
  }

  const referenceDate = today();
  const current = await getGymSubscription(admin.gymId);
  const stillCovered = current?.paid_until && daysBetween(referenceDate, current.paid_until) >= 0;
  const coveredUntil = addDays(stillCovered ? current.paid_until : referenceDate, SAAS_PERIOD_DAYS);

  const paidUntil = await recordSubscriptionPayment({
    gymId: admin.gymId,
    amount: SAAS_PRICE_RUPEES,
    paidOn: referenceDate,
    coveredUntil,
    orderId,
    paymentId,
  });

  return ok({ paidUntil });
});
