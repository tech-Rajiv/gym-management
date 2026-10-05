import { Receiver } from "@upstash/qstash";
import { sendDailyReport } from "@/lib/reports/dailyReport";

/**
 * POST /api/cron/daily-report
 *
 * Called by Upstash QStash every morning at 6:00 AM India time (the schedule
 * is created by `npm run report:schedule`). Sends the daily report email.
 *
 * There is no admin session here - QStash is not a logged-in user - so
 * proxy.js lets this path through, and this route instead checks that the
 * request carries a valid QStash signature, signed with the keys in .env.
 * Anything else is refused, so nobody can trigger emails by calling the URL.
 */
export const dynamic = "force-dynamic";

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
});

export async function POST(request) {
  const signature = request.headers.get("upstash-signature");
  if (!signature) {
    return Response.json({ ok: false, message: "Missing signature." }, { status: 401 });
  }

  // The signature covers the exact body QStash sent, so it is read raw.
  const body = await request.text();
  try {
    const valid = await receiver.verify({ signature, body, clockTolerance: 30 });
    if (!valid) throw new Error("invalid");
  } catch {
    return Response.json({ ok: false, message: "Invalid signature." }, { status: 401 });
  }

  try {
    const result = await sendDailyReport();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron] daily report failed:", error);
    // A 500 makes QStash retry the delivery.
    return Response.json({ ok: false, message: error?.message }, { status: 500 });
  }
}
