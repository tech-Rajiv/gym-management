import "server-only";

import Razorpay from "razorpay";
import { SAAS_PRICE_RUPEES } from "@/lib/config";
import { getGymSubscription, recordSubscriptionPayment } from "@/lib/db/gyms";
import { today } from "@/lib/utils/dates";
import { upcomingCover } from "@/lib/utils/subscription";

/**
 * Writes one captured Razorpay payment onto this gym's software cover.
 *
 * The browser verify route and the Razorpay webhook both end here, so a
 * payment that arrives twice still extends cover once. The amount and the
 * gym id come from the order stored at Razorpay, not from the caller.
 *
 * @param {{ orderId: string, paymentId: string, expectedGymId?: number|string }} input
 *   expectedGymId is the signed-in gym. The webhook omits it and trusts the
 *   gym id stored on the order.
 */
export async function settleSubscriptionPayment({ orderId, paymentId, expectedGymId }) {
  const keyId = process.env.TEST_API_KEY;
  const keySecret = process.env.TEST_SECRET_KEY;
  if (!keyId || !keySecret) {
    return { ok: false, status: 500, message: "Payments are not configured yet." };
  }

  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const [order, payment] = await Promise.all([
    razorpay.orders.fetch(orderId),
    razorpay.payments.fetch(paymentId),
  ]);

  const amountPaise = SAAS_PRICE_RUPEES * 100;
  const gymId = Number(order?.notes?.gymId);
  const gymMatches = expectedGymId == null || Number(expectedGymId) === gymId;
  const captured =
    payment?.status === "captured" &&
    String(payment?.order_id) === String(orderId) &&
    Number(payment?.amount) === amountPaise &&
    Number(order?.amount) === amountPaise;

  if (!Number.isInteger(gymId) || gymId <= 0 || !gymMatches || !captured) {
    return { ok: false, status: 400, message: "That payment does not belong to this gym." };
  }

  const referenceDate = today();
  const current = await getGymSubscription(gymId);
  const coveredUntil = upcomingCover(current?.paid_until, referenceDate).ends;
  const paidUntil = await recordSubscriptionPayment({
    gymId,
    amount: SAAS_PRICE_RUPEES,
    paidOn: referenceDate,
    coveredUntil,
    orderId,
    paymentId,
  });

  return { ok: true, paidUntil };
}
