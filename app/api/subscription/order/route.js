import Razorpay from "razorpay";
import { fail, ok, withAdmin } from "@/lib/api";
import { SAAS_PERIOD_DAYS, SAAS_PRICE_RUPEES } from "@/lib/config";

/**
 * POST /api/subscription/order
 *
 * Starts a one-time Razorpay order for this gym's software fee.
 * The amount is decided here, not in the browser.
 */
export const POST = withAdmin(async (_request, _context, admin) => {
  const keyId = process.env.LIVE_API_KEY;
  const keySecret = process.env.LIVE_SECRET_KEY;
  if (!keyId || !keySecret) {
    return fail({ message: "Payments are not configured yet." }, 500);
  }

  const amountPaise = SAAS_PRICE_RUPEES * 100;
  const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: `gym-${admin.gymId}-${Date.now()}`.slice(0, 40),
    notes: { gymId: String(admin.gymId) },
  });

  return ok({
    keyId,
    orderId: order.id,
    amount: amountPaise,
    currency: "INR",
    gymName: admin.gymName,
    periodDays: SAAS_PERIOD_DAYS,
  });
});
