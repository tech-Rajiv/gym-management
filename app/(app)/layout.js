import DashboardLayout from "@/components/layout/DashboardLayout";
import { requireAdmin } from "@/lib/auth";
import { today, formatDate } from "@/lib/utils/dates";

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

  return (
    <DashboardLayout todayLabel={formatDate(today())} admin={admin}>
      {children}
    </DashboardLayout>
  );
}
