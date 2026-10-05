import "server-only";

import { buildTablePdf, formatRupees } from "./tablePdf";
import { getMembers } from "@/lib/db/members";
import { getPayments, getPaymentById } from "@/lib/db/payments";
import { getMembershipPlanById } from "@/lib/db/plans";
import { toId } from "@/lib/db";
import {
  describeMembership,
  normalizeMemberFilter,
  MEMBER_FILTERS,
} from "@/lib/utils/membershipStatus";
import { getMethodLabel } from "@/lib/utils/paymentStatus";
import { resolvePeriod } from "@/lib/utils/period";
import { formatDate, formatTime, toGymDate, today, startOfMonth } from "@/lib/utils/dates";
import { EXPIRING_SOON_DAYS } from "@/lib/config";

/**
 * What each downloadable list contains. Every export takes the same filters
 * as its page (read from the URL), so the PDF is exactly the list on screen -
 * but all of it, not just the rows a page shows.
 *
 * Each returns { buffer, filename }, or null when what was asked for does not
 * exist (a plan id that is not there).
 */

/** Badge variants as PDF text colours. */
const TONE = { success: "success", warning: "warning", danger: "danger", neutral: "muted", primary: null };

/** "expiring-soon" - for file names. */
const slug = (text) =>
  String(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const fileName = (...parts) => `aura-${parts.filter(Boolean).map(slug).join("-")}-${today()}.pdf`;

// --- Members ------------------------------------------------------------------

/** A title that says exactly what the list is, and a line on what is in it. */
function membersHeading(filter) {
  const month = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${startOfMonth(today())}T00:00:00Z`)
  );
  switch (filter) {
    case "new":
      return { title: "New Members This Month", subtitle: `Members who joined the gym in ${month}.` };
    case "expiring":
      return {
        title: "Memberships Expiring Soon",
        subtitle: `Members whose membership ends within the next ${EXPIRING_SOON_DAYS} days.`,
      };
    case "expired":
      return {
        title: "Expired Memberships",
        subtitle: "Members whose membership has ended and has not been renewed yet.",
      };
    case "left":
      return { title: "Members Who Have Left", subtitle: "Members marked as having left the gym." };
    default:
      return {
        title: "All Members",
        subtitle: "Everyone currently training at the gym, with their current membership. Members who have left are not included.",
      };
  }
}

export async function membersPdf({ q = "", status } = {}) {
  const filter = normalizeMemberFilter(status);
  const filterLabel = MEMBER_FILTERS.find((option) => option.value === filter)?.label ?? "All";
  const members = await getMembers({ search: q, status: filter });

  const rows = members.map((member) => {
    const isLeft = member.member_status === "left";
    const membership = describeMembership(member.membership_end_date);

    return {
      name: member.full_name,
      phone: member.phone,
      plan: member.plan_name ?? "-",
      start: member.membership_start_date ? formatDate(member.membership_start_date) : "-",
      end: member.membership_end_date ? formatDate(member.membership_end_date) : "-",
      status: isLeft
        ? { content: "Left", tone: "muted" }
        : { content: membership.label, tone: TONE[membership.variant] },
      lastPaid: member.last_payment_on
        ? `${formatRupees(member.last_payment_amount)} on ${formatDate(member.last_payment_on)}`
        : { content: "No payment yet", tone: "muted" },
    };
  });

  const { title, subtitle } = membersHeading(filter);
  return {
    filename: fileName("members", filter !== "all" && filterLabel),
    buffer: buildTablePdf({
      kind: "Members report",
      title,
      subtitle,
      orientation: "landscape",
      details: [
        { label: "Showing", value: filterLabel },
        ...(q ? [{ label: "Search", value: `"${q}"` }] : []),
        { label: "Members", value: String(members.length) },
      ],
      columns: [
        { header: "Member", key: "name", bold: true },
        { header: "Phone", key: "phone", width: 32 },
        { header: "Current plan", key: "plan", width: 30 },
        { header: "Plan start", key: "start", width: 26 },
        { header: "Plan expiry", key: "end", width: 26 },
        { header: "Status", key: "status", width: 32 },
        { header: "Last payment", key: "lastPaid", width: 52 },
      ],
      rows,
      emptyText: "No members match these filters.",
    }),
  };
}

// --- One plan's members -------------------------------------------------------

export async function planMembersPdf({ plan: id } = {}) {
  const planId = toId(id);
  const plan = planId ? await getMembershipPlanById(planId) : null;
  if (!plan) return null;

  const members = await getMembers({ planId: plan.id });
  const rows = members.map((member) => {
    const membership = describeMembership(member.membership_end_date);
    return {
      name: member.full_name,
      phone: member.phone,
      start: member.membership_start_date ? formatDate(member.membership_start_date) : "-",
      end: member.membership_end_date ? formatDate(member.membership_end_date) : "-",
      status: { content: membership.label, tone: TONE[membership.variant] },
      lastPaid: member.last_payment_on
        ? `${formatRupees(member.last_payment_amount)} on ${formatDate(member.last_payment_on)}`
        : { content: "No payment yet", tone: "muted" },
    };
  });

  return {
    filename: fileName("plan", plan.name),
    buffer: buildTablePdf({
      kind: "Plan report",
      title: `Members on the ${plan.name} Plan`,
      subtitle:
        `Everyone whose current membership is on the ${plan.name} plan, with its start and end dates.` +
        (plan.is_active ? "" : " This plan is no longer sold."),
      orientation: "landscape",
      details: [
        { label: "Plan", value: plan.name },
        { label: "Length", value: `${plan.duration_days} days` },
        { label: "Price", value: formatRupees(plan.price) },
        { label: "Cardio", value: plan.includes_cardio ? "Included" : "Not included" },
        { label: "Members", value: String(members.length) },
      ],
      columns: [
        { header: "Member", key: "name", bold: true },
        { header: "Phone", key: "phone", width: 34 },
        { header: "Plan start", key: "start", width: 28 },
        { header: "Plan expiry", key: "end", width: 28 },
        { header: "Status", key: "status", width: 32 },
        { header: "Last payment", key: "lastPaid", width: 56 },
      ],
      rows,
      emptyText: "No members are on this plan.",
    }),
  };
}

// --- Payments -----------------------------------------------------------------

export async function paymentsPdf({ q = "", month, from, to } = {}) {
  const period = resolvePeriod({ month, from, to });
  const payments = await getPayments({ search: q, from: period.from, to: period.to });

  const sum = (list) => list.reduce((total, payment) => total + Number(payment.amount), 0);
  const rows = payments.map((payment) => ({
    date: formatDate(payment.paid_on),
    member: payment.member_name,
    phone: payment.member_phone,
    term: payment.plan_name
      ? `${payment.plan_name}\n${formatDate(payment.membership_start_date)} to ${formatDate(payment.membership_end_date)}`
      : "-",
    method: getMethodLabel(payment.method),
    reference: payment.reference ?? "-",
    remark: payment.remark ?? "-",
    amount: formatRupees(payment.amount),
  }));

  return {
    filename: fileName("payments", period.mode === "month" ? period.month : period.mode !== "all" && period.label),
    buffer: buildTablePdf({
      kind: "Payments report",
      // "This month (October 2026)" reads as just "October 2026" in a title.
      title:
        period.mode === "all"
          ? "Payment History"
          : `Payments Received - ${period.label.match(/\((.+)\)/)?.[1] ?? period.label}`,
      subtitle:
        period.mode === "all"
          ? "Every payment received, newest first."
          : period.from && period.from === period.to
            ? `Every payment received on ${formatDate(period.from)}, with all its details.`
            : "Every payment received in this period, newest first.",
      orientation: "landscape",
      details: [
        { label: "Period", value: period.label },
        ...(q ? [{ label: "Search", value: `"${q}"` }] : []),
        { label: "Payments", value: String(payments.length) },
        { label: "Total received", value: formatRupees(sum(payments)) },
        { label: "Cash", value: formatRupees(sum(payments.filter((p) => p.method === "cash"))) },
        { label: "UPI", value: formatRupees(sum(payments.filter((p) => p.method === "upi"))) },
      ],
      columns: [
        { header: "Date", key: "date", width: 25 },
        { header: "Member", key: "member", width: 38, bold: true },
        { header: "Phone", key: "phone", width: 30 },
        { header: "For", key: "term", width: 50 },
        { header: "Method", key: "method", width: 18 },
        { header: "UTR", key: "reference", width: 30 },
        { header: "Remark", key: "remark" },
        { header: "Amount", key: "amount", width: 26, align: "right", bold: true },
      ],
      rows,
      emptyText: "No payments match these filters.",
    }),
  };
}

// --- One payment: a receipt ----------------------------------------------------

export async function paymentPdf({ id } = {}) {
  const paymentId = toId(id);
  const payment = paymentId ? await getPaymentById(paymentId) : null;
  if (!payment) return null;

  const created = new Date(payment.created_at);
  const rows = [
    { label: "Receipt no.", value: `#${payment.id}` },
    { label: "Member", value: payment.member_name },
    { label: "Phone", value: payment.member_phone },
    { label: "Amount paid", value: formatRupees(payment.amount) },
    { label: "Paid on", value: formatDate(payment.paid_on) },
    { label: "Method", value: getMethodLabel(payment.method) },
    { label: "UTR / reference", value: payment.reference ?? "-" },
    { label: "Plan", value: payment.plan_name ?? "-" },
    {
      label: "Membership covered",
      value: payment.membership_start_date
        ? `${formatDate(payment.membership_start_date)} to ${formatDate(payment.membership_end_date)}`
        : "-",
    },
    { label: "Plan price", value: formatRupees(payment.membership_price) },
    { label: "Remark", value: payment.remark ?? "-" },
    {
      label: "Recorded",
      value: `${formatDate(toGymDate(created))}, ${formatTime(created)}`,
    },
  ];

  return {
    filename: fileName("receipt", String(payment.id), payment.member_name),
    buffer: buildTablePdf({
      kind: "Payment receipt",
      title: "Payment Receipt",
      subtitle: `${formatRupees(payment.amount)} received from ${payment.member_name} on ${formatDate(
        payment.paid_on
      )}.`,
      details: [
        { label: "Receipt no.", value: `#${payment.id}` },
        { label: "Amount", value: formatRupees(payment.amount) },
        { label: "Paid on", value: formatDate(payment.paid_on) },
        { label: "Method", value: getMethodLabel(payment.method) },
      ],
      numbered: false,
      columns: [
        { header: "Detail", key: "label", width: 55, bold: true },
        { header: "Value", key: "value" },
      ],
      rows,
    }),
  };
}

/** The lists that can be downloaded, by the name used in the URL. */
export const EXPORTS = {
  members: membersPdf,
  payments: paymentsPdf,
  "plan-members": planMembersPdf,
  payment: paymentPdf,
};
