import { EXPIRING_SOON_DAYS, SAAS_PERIOD_DAYS } from "@/lib/config";
import { addDays, daysBetween, formatDate, today } from "@/lib/utils/dates";

/**
 * What the gym owner (and the founder) should read about a software
 * subscription. Member fees are a different thing and never come through here.
 *
 * `paid_until` is the last day of access. Inside EXPIRING_SOON_DAYS the
 * wording changes so the owner sees the date before it arrives, not only
 * after the gym has already expired.
 *
 * @param {{ status?: string, paid_until?: string|null }|null} row
 * @param {string} [referenceDate] the gym's today, "YYYY-MM-DD"
 */
export function describeSubscription(row, referenceDate = today()) {
  const paidUntil = row?.paid_until || null;
  const markedPaid = row?.status === "paid" && Boolean(paidUntil);

  if (!markedPaid) {
    return {
      state: "unpaid",
      label: "Not paid",
      headline: "Subscription needed",
      detail: "This gym has not paid for the software, so there is no cover date.",
      paidUntil: null,
      daysLeft: null,
    };
  }

  const daysLeft = daysBetween(referenceDate, paidUntil);
  const until = formatDate(paidUntil);

  if (daysLeft < 0) {
    return {
      state: "expired",
      label: "Expired",
      headline: `Cover ended on ${until}`,
      detail: "The last paid day has passed. Pay to open the gym again.",
      paidUntil,
      daysLeft,
    };
  }

  if (daysLeft <= EXPIRING_SOON_DAYS) {
    const left = daysLeft === 0 ? "Last day" : daysLeft === 1 ? "1 day left" : `${daysLeft} days left`;
    return {
      state: "expiring",
      label: left,
      headline: daysLeft === 0 ? "Cover ends today" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`,
      detail: `Covered until ${until}. Renew before that day so the gym stays open.`,
      paidUntil,
      daysLeft,
    };
  }

  return {
    state: "paid",
    label: "Active",
    headline: `Covered until ${until}`,
    detail: `${daysLeft} days remaining.`,
    paidUntil,
    daysLeft,
  };
}

/**
 * Each software payment's own cover window.
 *
 * Payments are stored with an end date only. The first payment starts
 * SAAS_PERIOD_DAYS before that end. A later payment starts the day after the
 * previous end, because that day was already covered.
 *
 * @param {{ id: number, paid_on: string, covered_until: string }[]} payments
 */
export function subscriptionPaymentRanges(payments) {
  const sorted = [...payments].sort((a, b) => {
    if (a.paid_on !== b.paid_on) return a.paid_on < b.paid_on ? -1 : 1;
    return a.id - b.id;
  });
  let previousEnd = null;
  return sorted.map((payment) => {
    const coveredFrom = previousEnd
      ? addDays(previousEnd, 1)
      : addDays(payment.covered_until, -SAAS_PERIOD_DAYS);
    previousEnd = payment.covered_until;
    return { ...payment, coveredFrom };
  });
}

/**
 * The dates one new payment would cover.
 *
 * A first payment, or one after cover has ended, runs from today for
 * SAAS_PERIOD_DAYS. A payment while cover is still current starts the day
 * after the current end, because that day is already paid.
 *
 * @param {string|null} paidUntil the gym's current last covered day
 * @param {string} [referenceDate] the gym's today, "YYYY-MM-DD"
 * @returns {{ starts: string, ends: string }}
 */
export function upcomingCover(paidUntil, referenceDate = today()) {
  const stillCovered = Boolean(paidUntil) && daysBetween(referenceDate, paidUntil) >= 0;
  if (stillCovered) {
    return {
      starts: addDays(paidUntil, 1),
      ends: addDays(paidUntil, SAAS_PERIOD_DAYS),
    };
  }
  return {
    starts: referenceDate,
    ends: addDays(referenceDate, SAAS_PERIOD_DAYS),
  };
}

/** The gym app is open only while cover is current. The last week still counts. */
export function subscriptionAllowsAccess(subscription) {
  return subscription?.state === "paid" || subscription?.state === "expiring";
}
