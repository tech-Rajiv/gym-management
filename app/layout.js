import DashboardLayout from "@/components/layout/DashboardLayout";
import { APP_FULL_NAME } from "@/lib/config";
import { today, formatDate } from "@/lib/utils/dates";
import "./globals.css";

export const metadata = {
  title: {
    default: APP_FULL_NAME,
    template: `%s — ${APP_FULL_NAME}`,
  },
  description: "Member and membership management for Aura Fitness.",
};

/**
 * The root layout - a Server Component, like every page in this application.
 *
 * The gym's current date is worked out here, on the server, and handed down as
 * a formatted string. Everything below this point that needs "today" for a
 * calculation gets it from the same source.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <DashboardLayout todayLabel={formatDate(today())}>{children}</DashboardLayout>
      </body>
    </html>
  );
}
