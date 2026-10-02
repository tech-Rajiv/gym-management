import "server-only";

import { buildTablePdf, formatRupees } from "./tablePdf";
import { getMembers } from "@/lib/db/members";
import { getPayments } from "@/lib/db/payments";
import {
  describeMembership,
  normalizeMemberFilter,
  MEMBER_FILTERS,
} from "@/lib/utils/membershipStatus";
import { getMethodLabel } from "@/lib/utils/paymentStatus";
import { resolvePaymentPeriod } from "@/lib/utils/paymentPeriod";
import { formatDate, today } from "@/lib/utils/dates";

/**
 * What each downloadable list contains. Every export takes the same filters
 * as its page (read from the URL), so the PDF is exactly the list on screen -
 * but all of it, not just the rows a page shows.
 *
 * Each returns { buffer, filename }.
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

  const title = filter === "all" ? "Members" : `Members - ${filterLabel}`;
  return {
    filename: fileName("members", filter !== "all" && filterLabel),
    buffer: buildTablePdf({
      title,
      orientation: "landscape",
      filters: [
        `Showing: ${filterLabel}${q ? `  ·  Search: "${q}"` : ""}`,
      ],
      summary: [
        { label: members.length === 1 ? "member" : "members", value: String(members.length) },
      ],
      columns: [
        { header: "Member", key: "name" },
        { header: "Phone", key: "phone", width: 32 },
        { header: "Plan", key: "plan", width: 26 },
        { header: "Start", key: "start", width: 25 },
        { header: "Expiry", key: "end", width: 25 },
        { header: "Status", key: "status", width: 28 },
        { header: "Last payment", key: "lastPaid", width: 52 },
      ],
      rows,
      emptyText: "No members match these filters.",
    }),
  };
}

// --- Payments -----------------------------------------------------------------

export async function paymentsPdf({ q = "", method, month, from, to } = {}) {
  const period = resolvePaymentPeriod({ month, from, to });
  const methodFilter = method === "upi" || method === "cash" ? method : null;
  const payments = await getPayments({ search: q, method: methodFilter, from: period.from, to: period.to });

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
    amount: { content: formatRupees(payment.amount), tone: "success" },
  }));

  return {
    filename: fileName("payments", period.mode !== "all" && period.label, methodFilter),
    buffer: buildTablePdf({
      title: "Payment History",
      orientation: "landscape",
      filters: [
        `Period: ${period.label}  ·  Method: ${methodFilter ? getMethodLabel(methodFilter) : "Cash and UPI"}${
          q ? `  ·  Search: "${q}"` : ""
        }`,
      ],
      summary: [
        { label: payments.length === 1 ? "payment" : "payments", value: String(payments.length) },
        { label: "total received", value: formatRupees(sum(payments)) },
        { label: "by cash", value: formatRupees(sum(payments.filter((p) => p.method === "cash"))) },
        { label: "by UPI", value: formatRupees(sum(payments.filter((p) => p.method === "upi"))) },
      ],
      columns: [
        { header: "Date", key: "date", width: 25 },
        { header: "Member", key: "member", width: 38 },
        { header: "Phone", key: "phone", width: 30 },
        { header: "For", key: "term", width: 50 },
        { header: "Method", key: "method", width: 18 },
        { header: "UTR", key: "reference", width: 30 },
        { header: "Remark", key: "remark" },
        { header: "Amount", key: "amount", width: 26, align: "right" },
      ],
      rows,
      emptyText: "No payments match these filters.",
    }),
  };
}

/** The lists that can be downloaded, by the name used in the URL. */
export const EXPORTS = {
  members: membersPdf,
  payments: paymentsPdf,
};
