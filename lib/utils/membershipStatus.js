/**
 * Membership status.
 *
 * The Active / Expiring Soon / Expired label is never stored in the database -
 * it would be wrong the moment the clock ticked past midnight. It is derived
 * here, from the end date, every time it is needed.
 *
 * This module is the single source of truth for that rule. The dashboard, the
 * members table and any future reports, renewal reminders or attendance checks
 * should all call `getMembershipStatus` rather than compare dates themselves.
 */

import { EXPIRING_SOON_DAYS } from "@/lib/config";
import { today, daysBetween, addDays } from "@/lib/utils/dates";

/** The possible statuses. Used as keys for labels and badge colours. */
export const MEMBERSHIP_STATUS = {
  ACTIVE: "active",
  EXPIRING_SOON: "expiring_soon",
  EXPIRED: "expired",
  NONE: "none",
};

const STATUS_LABELS = {
  [MEMBERSHIP_STATUS.ACTIVE]: "Active",
  [MEMBERSHIP_STATUS.EXPIRING_SOON]: "Expiring Soon",
  [MEMBERSHIP_STATUS.EXPIRED]: "Expired",
  [MEMBERSHIP_STATUS.NONE]: "No Membership",
};

/** Maps a status onto one of the Badge component's visual variants. */
const STATUS_VARIANTS = {
  [MEMBERSHIP_STATUS.ACTIVE]: "success",
  [MEMBERSHIP_STATUS.EXPIRING_SOON]: "warning",
  [MEMBERSHIP_STATUS.EXPIRED]: "danger",
  [MEMBERSHIP_STATUS.NONE]: "neutral",
};

/**
 * Works out where a membership stands today.
 *
 * @param {string|null} endDate  membership end date as "YYYY-MM-DD"
 * @param {string} referenceDate the date to judge against, defaults to today
 *                               in the gym's timezone. Passing it explicitly
 *                               keeps this function pure and testable.
 * @returns {string} one of MEMBERSHIP_STATUS
 */
export function getMembershipStatus(endDate, referenceDate = today()) {
  if (!endDate) return MEMBERSHIP_STATUS.NONE;

  const daysRemaining = daysBetween(referenceDate, endDate);

  if (daysRemaining < 0) return MEMBERSHIP_STATUS.EXPIRED;
  if (daysRemaining <= EXPIRING_SOON_DAYS) return MEMBERSHIP_STATUS.EXPIRING_SOON;
  return MEMBERSHIP_STATUS.ACTIVE;
}

/** True when the membership has already run out. */
export function isExpired(endDate, referenceDate = today()) {
  return getMembershipStatus(endDate, referenceDate) === MEMBERSHIP_STATUS.EXPIRED;
}

/** True when the membership runs out within the configured warning window. */
export function isExpiringSoon(endDate, referenceDate = today()) {
  return getMembershipStatus(endDate, referenceDate) === MEMBERSHIP_STATUS.EXPIRING_SOON;
}

/** True while the member can still train - active or expiring, but not expired. */
export function isCurrentlyActive(endDate, referenceDate = today()) {
  const status = getMembershipStatus(endDate, referenceDate);
  return status === MEMBERSHIP_STATUS.ACTIVE || status === MEMBERSHIP_STATUS.EXPIRING_SOON;
}

/** Human-readable label, e.g. "Expiring Soon". */
export function getStatusLabel(status) {
  return STATUS_LABELS[status] ?? STATUS_LABELS[MEMBERSHIP_STATUS.NONE];
}

/** Badge variant for a status, e.g. "warning". */
export function getStatusVariant(status) {
  return STATUS_VARIANTS[status] ?? "neutral";
}

/**
 * Everything the UI needs about a membership's standing, in one call.
 * Components take this and render - they do no date maths of their own.
 */
export function describeMembership(endDate, referenceDate = today()) {
  const status = getMembershipStatus(endDate, referenceDate);
  return {
    status,
    label: getStatusLabel(status),
    variant: getStatusVariant(status),
    daysRemaining: endDate ? daysBetween(referenceDate, endDate) : null,
  };
}

/**
 * The filters offered on the members page.
 *
 * These are defined here, next to the status rules they mirror, so the filter
 * a user picks and the badge they see are talking about the same thing. The
 * `value` is what appears in the URL as `?status=`.
 *
 * Note that "Active" includes memberships that are expiring soon - a member
 * whose term ends on Friday is still training this week. That matches the
 * dashboard's Active Members count, so clicking that card and using this
 * filter give the same list.
 */
export const MEMBER_FILTERS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expiring", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
];

export const DEFAULT_MEMBER_FILTER = "all";

/**
 * Accepts a filter value from the URL, falling back to "all".
 *
 * Anything can arrive in a query string, so this is the gate: an unknown value
 * shows every member rather than an empty page or an error.
 */
export function normalizeMemberFilter(value) {
  return MEMBER_FILTERS.some((filter) => filter.value === value)
    ? value
    : DEFAULT_MEMBER_FILTER;
}

/**
 * Where a member's next term should start.
 *
 * Coverage runs continuously: the new term begins the day after the old one
 * ended, whether that is in the future or the past. A member whose term ran
 * out three days ago and pays today is buying a term that started three days
 * ago, not one starting this morning - otherwise those three days silently
 * vanish and their renewal date drifts later every time.
 *
 * A member with no term at all starts today.
 *
 * The payment form fills this in automatically and the owner can still change
 * it, since only they know whether those days should really be covered.
 */
export function getNextTermStartDate(currentEndDate, referenceDate = today()) {
  if (!currentEndDate) return referenceDate;
  return addDays(currentEndDate, 1);
}

/**
 * Where a term of the given plan ends if it starts on `startDate`.
 *
 * Terms are inclusive of both ends, so a 30-day plan starting on the 1st runs
 * to the 30th, not the 31st - the start day is day one. That is what makes
 * `getNextTermStartDate` (end + 1 day) leave neither a gap nor an overlap.
 *
 * Auto-filled by the forms, and editable - a plan is a default, not a rule.
 */
export function getTermEndDate(startDate, durationDays) {
  if (!startDate || !durationDays) return "";
  return addDays(startDate, Number(durationDays) - 1);
}
