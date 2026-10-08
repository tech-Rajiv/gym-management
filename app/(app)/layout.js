import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { requireAdmin } from "@/lib/auth";
import { getGymSubscription } from "@/lib/db/gyms";
import { today, formatDate } from "@/lib/utils/dates";
import { describeSubscription, subscriptionAllowsAccess } from "@/lib/utils/subscription";

/**
 * The signed-in part of the application.
 *
 * Everything in the (app) route group - dashboard, members, payments, history -
 * renders inside this shell. The parentheses keep "(app)" out of the URLs.
 *
 * The session is checked here so the shell can show who is signed in, and
 * again by each page: a layout is not re-rendered on every navigation, so it
 * cannot be the only guard. Both calls share one database lookup per request.
 *
 * The gym's current date is worked out here, on the server, and handed down as
 * a formatted string.
 */
export default async function AppLayout({ children }) {
  const admin = await requireAdmin();
  const referenceDate = today();
  const subscription = describeSubscription(
    await getGymSubscription(admin.gymId),
    referenceDate
  );
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "";
  const onPayPage = pathname === "/subscription/pay";
  // Cover has ended: end the session. Signing in again explains why, then
  // opens the payment page. The payment page itself keeps the session.
  // A prefetch must not clear the cookie, or opening the payment page would
  // sign the owner out before they can pay.
  if (!subscriptionAllowsAccess(subscription) && !onPayPage) {
    const isPrefetch = headerList.get("next-router-prefetch") === "1";
    redirect(isPrefetch ? "/subscription/pay" : "/api/auth/end-session");
  }

  return (
    <DashboardLayout
      todayLabel={formatDate(referenceDate)}
      admin={admin}
      subscription={subscription}
    >
      {children}
    </DashboardLayout>
  );
}
