/**
 * The date filter shared by Payment History and History Logs: All time, This
 * month, Last month, or a custom range.
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

/** "2026-10" for the month `referenceDate` is in, and the month before it. */
function thisAndLastMonth(referenceDate) {
  const [year, month] = referenceDate.split("-").map(Number);
  const pad = (value) => String(value).padStart(2, "0");
  const thisMonth = `${year}-${pad(month)}`;
  const lastMonth = month === 1 ? `${year - 1}-12` : `${year}-${pad(month - 1)}`;
  return { thisMonth, lastMonth };
}

/**
 * The months the picker offers - This month and Last month - as
 * `{ value: "2026-10", label: "This month" }`.
 */
export function periodOptions(referenceDate = gymToday()) {
  const { thisMonth, lastMonth } = thisAndLastMonth(referenceDate);
  return [
    { value: thisMonth, label: "This month" },
    { value: lastMonth, label: "Last month" },
  ];
}

/**
 * Turns the URL's period into dates for the query. A month other than this
 * or last (from an old bookmark, say) still works; it is just not offered.
 *
 * @returns {{ mode: 'all'|'month'|'custom', month: string|null,
 *             from: string|null, to: string|null, label: string }}
 */
export function resolvePeriod({ month, from, to } = {}, referenceDate = gymToday()) {
  if (typeof month === "string" && MONTH.test(month)) {
    const { thisMonth, lastMonth } = thisAndLastMonth(referenceDate);
    const label =
      month === thisMonth
        ? `This month (${formatMonth(month)})`
        : month === lastMonth
          ? `Last month (${formatMonth(month)})`
          : formatMonth(month);
    return { mode: "month", month, from: `${month}-01`, to: lastDayOf(month), label };
  }

  let start = isValidDate(from) ? from : null;
  let end = isValidDate(to) ? to : null;
  // A range typed backwards is read the right way round.
  if (start && end && start > end) [start, end] = [end, start];

  if (start || end) {
    const label =
      start && end
        ? start === end
          ? formatDate(start)
          : `${formatDate(start)} – ${formatDate(end)}`
        : start
          ? `From ${formatDate(start)}`
          : `Up to ${formatDate(end)}`;
    return { mode: "custom", month: null, from: start, to: end, label };
  }

  return { mode: "all", month: null, from: null, to: null, label: "All time" };
}
