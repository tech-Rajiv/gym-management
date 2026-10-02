/**
 * The date filter on the payment history.
 *
 * A period comes from the URL in one of two shapes:
 *
 *   ?month=2026-09            one calendar month
 *   ?from=2026-09-05&to=...   a custom range (either end may be left open)
 *
 * and is resolved here into the inclusive `from` / `to` dates the query uses,
 * plus a label for the screen. Anything malformed is ignored rather than
 * trusted, so a bad link shows all payments instead of an error.
 *
 * Dates stay "YYYY-MM-DD" strings throughout - see lib/utils/dates.js.
 */

import { isValidDate, formatDate, today as gymToday } from "@/lib/utils/dates";

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/** "2026-09" -> "September 2026". */
export function formatMonth(month) {
  const [year, m] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, m - 1, 1))
  );
}

/** The last day of a "YYYY-MM" month, as "YYYY-MM-DD". */
function lastDayOf(month) {
  const [year, m] = month.split("-").map(Number);
  const day = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return `${month}-${String(day).padStart(2, "0")}`;
}

/**
 * The months offered in the picker: this month and the eleven before it,
 * newest first.
 */
export function recentMonths(referenceDate = gymToday(), count = 12) {
  let [year, month] = referenceDate.split("-").map(Number);
  const months = [];
  for (let i = 0; i < count; i += 1) {
    const value = `${year}-${String(month).padStart(2, "0")}`;
    months.push({ value, label: formatMonth(value) });
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return months;
}

/**
 * Turns the URL's period into dates for the query.
 *
 * @returns {{ mode: 'all'|'month'|'custom', month: string|null,
 *             from: string|null, to: string|null, label: string }}
 */
export function resolvePaymentPeriod({ month, from, to } = {}) {
  if (typeof month === "string" && MONTH.test(month)) {
    return {
      mode: "month",
      month,
      from: `${month}-01`,
      to: lastDayOf(month),
      label: formatMonth(month),
    };
  }

  let start = isValidDate(from) ? from : null;
  let end = isValidDate(to) ? to : null;
  // A range typed backwards is read the right way round.
  if (start && end && start > end) [start, end] = [end, start];

  if (start || end) {
    const label =
      start && end
        ? `${formatDate(start)} – ${formatDate(end)}`
        : start
          ? `From ${formatDate(start)}`
          : `Up to ${formatDate(end)}`;
    return { mode: "custom", month: null, from: start, to: end, label };
  }

  return { mode: "all", month: null, from: null, to: null, label: "All time" };
}
