import { ok, fail, withAdmin } from "@/lib/api";
import { sendDailyReport } from "@/lib/reports/dailyReport";

/**
 * POST /api/reports/daily
 *
 * The dashboard's "Email me the report" button: sends the daily report right
 * now - the very same email the 6 AM schedule sends - so the admin can see
 * what will arrive in the morning. Signed-in admins only.
 */
export const POST = withAdmin(async (_request, _context, admin) => {
  try {
    const { to, counts } = await sendDailyReport({ greetingName: admin.name });
    return ok({ to, counts });
  } catch (error) {
    return fail({ message: error?.message ?? "The report could not be sent." }, 502);
  }
});
