/**
 * Date helpers.
 *
 * Every membership date in this application is a plain calendar string in
 * `YYYY-MM-DD` form - never a JavaScript Date object. That is deliberate:
 *
 *   * `date` columns in Postgres have no time and no timezone. Turning them
 *     into Date objects invents a midnight UTC timestamp, which then shifts to
 *     the previous day for anyone west of Greenwich when formatted locally.
 *     "Expires Sep 12" quietly becomes "Sep 11".
 *   * Comparing `YYYY-MM-DD` strings alphabetically gives the same answer as
 *     comparing the dates, so range checks need no date maths at all.
 *
 * The database driver is configured (in lib/db/index.js) to hand back `date`
 * columns as these strings already, so the two halves match.
 */

import { GYM_TIMEZONE } from "@/lib/config";

/** Matches a calendar date string, e.g. "2026-09-12". */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Today's date in the gym's timezone, as "YYYY-MM-DD".
 * `en-CA` is used because it formats dates in exactly that order.
 */
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: GYM_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** True if the value looks like a usable calendar date string. */
export function isValidDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  // Round-trips through UTC to reject impossible dates such as 2026-02-31.
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Adds days to a calendar date and returns a new "YYYY-MM-DD" string.
 * The maths runs in UTC so it can never be knocked sideways by a local
 * daylight-saving change.
 */
export function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Whole days from `from` to `to`. Negative when `to` is in the past. */
export function daysBetween(from, to) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY);
}

/** The first day of the month that `dateString` falls in. */
export function startOfMonth(dateString = today()) {
  return `${dateString.slice(0, 7)}-01`;
}

/** True when `joinDate` falls in the same calendar month as today. */
export function isJoinedThisMonth(joinDate, referenceDate = today()) {
  if (!joinDate) return false;
  return joinDate.slice(0, 7) === referenceDate.slice(0, 7);
}

/**
 * Formats a date for display: "2026-09-12" -> "Sep 12, 2026".
 * Parsed as UTC and formatted as UTC, so the day never shifts.
 */
export function formatDate(dateString) {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(`${dateString}T00:00:00Z`));
}

/** A short form for dense tables: "Sep 12". */
export function formatDateShort(dateString) {
  if (!dateString) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "2-digit",
  }).format(new Date(`${dateString}T00:00:00Z`));
}

/** Age in whole years, or null when no date of birth is on file. */
export function calculateAge(dateOfBirth, referenceDate = today()) {
  if (!dateOfBirth) return null;
  const [birthYear, birthMonth, birthDay] = dateOfBirth.split("-").map(Number);
  const [year, month, day] = referenceDate.split("-").map(Number);
  let age = year - birthYear;
  if (month < birthMonth || (month === birthMonth && day < birthDay)) age -= 1;
  return age >= 0 ? age : null;
}
