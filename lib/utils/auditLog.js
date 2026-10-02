/**
 * Audit log helpers.
 *
 * Two jobs live here, kept side by side so they cannot drift apart:
 *
 *   * building the `details` a change is logged with - for an edit, the list
 *     of fields that actually changed, worked out before anything is written;
 *   * turning a stored log row back into words for the History page.
 *
 * `details` shapes by action:
 *
 *   member  create   { phone, plan, termStart, termEnd }
 *   member  update   { changes: [{ field, label, from, to }] }
 *   member  left     {}
 *   member  restore  {}
 *   payment create   { memberId, amount, method, paidOn, reference, remark,
 *                      plan, termStart, termEnd, newTerm }
 *   payment delete   { same as create }
 *   plan    create   { durationDays, price }
 *   plan    update   { changes: [{ field, label, from, to }] }
 *   plan    delete   { durationDays, price }
 *
 * Logins and logouts are not logged.
 */

import { formatDate } from "@/lib/utils/dates";
import { formatCurrency, titleCase } from "@/lib/utils/format";
import { getMethodLabel } from "@/lib/utils/paymentStatus";

/** Member fields an edit can change, in the order a change list is shown. */
const MEMBER_FIELDS = [
  ["firstName", "First name"],
  ["lastName", "Last name"],
  ["phone", "Phone"],
  ["email", "Email"],
  ["gender", "Gender"],
  ["dateOfBirth", "Date of birth"],
  ["address", "Address"],
  ["emergencyContactName", "Emergency contact"],
  ["emergencyContactPhone", "Emergency phone"],
  ["notes", "Notes"],
  ["joinDate", "Join date"],
  ["plan", "Plan"],
  ["membershipStartDate", "Membership start"],
  ["membershipEndDate", "Membership end"],
];

/** A member row from member_overview, flattened to the fields above. */
export function memberSnapshotFromRow(row) {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    address: row.address,
    emergencyContactName: row.emergency_contact_name,
    emergencyContactPhone: row.emergency_contact_phone,
    notes: row.notes,
    joinDate: row.join_date,
    plan: row.plan_name,
    membershipStartDate: row.membership_start_date,
    membershipEndDate: row.membership_end_date,
  };
}

/** Validated form values, flattened to the same fields. */
export function memberSnapshotFromValues(values, planName) {
  return {
    ...Object.fromEntries(MEMBER_FIELDS.map(([key]) => [key, values[key]])),
    plan: planName,
  };
}

/** Blank, null and undefined all mean "nothing on file". */
function normalise(value) {
  return value === undefined || value === null || value === "" ? null : String(value);
}

/** The fields that differ between two snapshots - what an edit really changed. */
export function diffMember(before, after) {
  return MEMBER_FIELDS.flatMap(([field, label]) => {
    const from = normalise(before[field]);
    const to = normalise(after[field]);
    return from === to ? [] : [{ field, label, from, to }];
  });
}

/** The fields of a plan an edit can change, for its change list. */
const PLAN_FIELDS = [
  ["name", "Name"],
  ["durationDays", "Length (days)"],
  ["price", "Price"],
  ["description", "Description"],
];

/**
 * What an edit to a plan changed, comparing the stored plan row with the
 * validated form values. Prices are compared as numbers so 1500 and 1500.00
 * are the same.
 */
export function diffPlan(row, values) {
  const before = {
    name: row.name,
    durationDays: row.duration_days,
    price: Number(row.price),
    description: row.description,
  };
  return PLAN_FIELDS.flatMap(([field, label]) => {
    const from = normalise(before[field]);
    const to = normalise(values[field]);
    return from === to ? [] : [{ field, label, from, to }];
  });
}

// --- Display -----------------------------------------------------------------

const ACTION_LABELS = {
  create: { label: "Created", variant: "success" },
  update: { label: "Edited", variant: "primary" },
  left: { label: "Marked left", variant: "warning" },
  restore: { label: "Restored", variant: "success" },
  delete: { label: "Deleted", variant: "danger" },
};

/**
 * Shows a stored value readably: dates as "Sep 12, 2026", prices as "₹1,500",
 * blanks as "empty".
 */
export function formatLogValue(value, field) {
  if (value === null || value === undefined || value === "") return "empty";
  if (field === "price") return formatCurrency(Number(value));
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  return String(value);
}

/** "Monthly · Sep 01, 2026 → Sep 30, 2026", or null with no term on record. */
function describeTerm(details) {
  if (!details.plan && !details.termStart) return null;
  const dates =
    details.termStart && details.termEnd
      ? `${formatDate(details.termStart)} → ${formatDate(details.termEnd)}`
      : null;
  return [details.plan, dates].filter(Boolean).join(" · ");
}

/**
 * Everything the History page shows for one log row.
 *
 * @returns {{ badge: {label, variant}, title: string, lines: string[],
 *             changes: {label, from, to}[], href: string|null }}
 */
export function describeLog(log) {
  const details = log.details ?? {};
  const badge = ACTION_LABELS[log.action] ?? { label: titleCase(log.action), variant: "neutral" };
  const who = log.entity_label ?? "Unknown";

  if (log.entity_type === "member") {
    const href = log.entity_id ? `/members/${log.entity_id}` : null;

    switch (log.action) {
      case "create":
        return {
          badge,
          title: `Added member ${who}`,
          lines: [details.phone, describeTerm(details)].filter(Boolean),
          changes: [],
          href,
        };
      case "update":
        return {
          badge,
          title: `Edited member ${who}`,
          lines: [],
          changes: details.changes ?? [],
          href,
        };
      case "left":
        return { badge, title: `Marked ${who} as left the gym`, lines: [], changes: [], href };
      case "restore":
        return { badge, title: `Marked ${who} as active again`, lines: [], changes: [], href };
      default:
        return { badge, title: `${badge.label} member ${who}`, lines: [], changes: [], href };
    }
  }

  if (log.entity_type === "payment") {
    const amount = formatCurrency(details.amount);
    const method = details.method ? getMethodLabel(details.method) : null;
    const term = describeTerm(details);
    const lines = [
      details.paidOn ? `Paid on ${formatDate(details.paidOn)}${method ? ` by ${method}` : ""}` : null,
      term ? `${details.newTerm ? "New term" : "For term"}: ${term}` : null,
      details.reference ? `UTR ${details.reference}` : null,
      details.remark ? `Remark: ${details.remark}` : null,
    ].filter(Boolean);
    const href = details.memberId ? `/members/${details.memberId}` : null;

    return {
      badge,
      title:
        log.action === "delete"
          ? `Deleted ${amount} payment from ${who}`
          : `Recorded ${amount} payment from ${who}`,
      lines,
      changes: [],
      href,
    };
  }

  if (log.entity_type === "plan") {
    const summary =
      details.durationDays !== undefined
        ? [`${details.durationDays} days · ${formatCurrency(details.price)}`]
        : [];
    const titles = {
      create: `Added plan ${who}`,
      update: `Edited plan ${who}`,
      delete: `Deleted plan ${who}`,
    };
    return {
      badge,
      title: titles[log.action] ?? `${badge.label} plan ${who}`,
      lines: log.action === "update" ? [] : summary,
      changes: details.changes ?? [],
      href: "/plans",
    };
  }

  return { badge, title: `${badge.label} ${log.entity_type}`, lines: [], changes: [], href: null };
}
