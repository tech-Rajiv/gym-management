import { createHmac, timingSafeEqual } from "node:crypto";
import { fail, ok } from "@/lib/api";
import { settleSubscriptionPayment } from "@/lib/subscription/settle";

/**
 * POST /api/subscription/webhook
 *
 * Razorpay calls this when a payment is captured. There is no logged-in
 * owner: the tab may already be closed. proxy.js leaves this path open, and
 * this route checks Razorpay's webhook signature instead.
 *
 * The secret is RAZORPAY_WEBHOOK_SECRET, the value set on the webhook in
 * the Razorpay dashboard. It is not the API key secret.
 */
export const dynamic = "force-dynamic";

function signedByRazorpay(secret, body, signature) {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const expectedBuf = Buffer.from(expected);
  const givenBuf = Buffer.from(signature);
  if (expectedBuf.length !== givenBuf.length) return false;
  return timingSafeEqual(expectedBuf, givenBuf);
}

export async function POST(request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return fail({ message: "Payments are not configured yet." }, 500);

  const signature = request.headers.get("x-razorpay-signature");
  const body = await request.text();
  if (!signature || !signedByRazorpay(secret, body, signature)) {
    return fail({ message: "Invalid signature." }, 400);
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return fail({ message: "Invalid payload." }, 400);
  }

  if (event?.event !== "payment.captured") return ok();

  const payment = event?.payload?.payment?.entity;
  const orderId = payment?.order_id;
  const paymentId = payment?.id;
  if (!orderId || !paymentId) return ok();

  try {
    const settled = await settleSubscriptionPayment({ orderId, paymentId });
    if (!settled.ok && settled.status === 500) return fail({ message: settled.message }, 500);
    if (!settled.ok) {
      console.error("[subscription] webhook did not record payment", paymentId);
      return ok();
    }
    return ok();
  } catch (error) {
    console.error("[subscription] webhook failed:", error);
    return fail({ message: "Could not record the payment." }, 500);
  }
}
