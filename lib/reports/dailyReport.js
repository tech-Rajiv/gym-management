import "server-only";

import {
  getDashboardStats,
  getExpiringMembers,
  getExpiredMembers,
} from "@/lib/db/dashboard";
import { sendEmail, REPORT_EMAIL_TO } from "@/lib/email";
import { getPrimaryAdmin } from "@/lib/db/auth";
import { APP_NAME } from "@/lib/config";
import { today, formatDate, formatDateShort, daysBetween } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/format";

/**
 * The daily report email - deliberately plain, so it reads at a glance:
 *
 *   Hello Hiren,
 *   Here is your report for Oct 02, 2026.
 *
 *   Expiring Soon (3)
 *   Member            Start   Expiry  Days left    Last paid
 *   Priya Mehta       Sep 05  Oct 05  3 days       ₹1,500 · Sep 05
 *   +91 90000 00003
 *
 *   Expired (5)
 *   Member            Start   Expiry  Expired      Last paid
 *   Manish Gohel      Aug 21  Sep 20  12 days ago  ₹1,500 · Aug 22
 *   +91 90000 00015
 *
 * The phone number sits under the name rather than in a column of its own,
 * which is what lets all of this fit on a phone.
 *
 * One function builds it and one sends it, and both the 6 AM schedule
 * (app/api/cron/daily-report) and the dashboard's "Email me the report"
 * button (app/api/reports/daily) call `sendDailyReport` - so the preview is
 * exactly the email that arrives in the morning.
 *
 * Email clients ignore stylesheets, so the little styling there is is inline.
 */

/** How many rows each table shows before "and N more". */
const MAX_ROWS = 25;

/** Plain greys only - text, quieter text, and the table lines. */
const INK = "#111827";
const MUTED = "#6b7280";
const LINE = "#e5e7eb";
const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Member names and phone numbers are typed by people - never trust them as HTML. */
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const plural = (count) => `${count} day${count === 1 ? "" : "s"}`;

/**
 * "Sep 05", with the year only when it is not this year - short enough for
 * a phone. Non-breaking spaces keep a date from splitting across two lines.
 */
function shortDate(date, referenceDate) {
  if (!date) return "-";
  const text =
    date.slice(0, 4) === referenceDate.slice(0, 4) ? formatDateShort(date) : formatDate(date);
  return text.replace(/ /g, "\u00a0");
}

/** "₹1,500 · Sep 05", or "No payment yet". A line can only break after "·". */
function lastPaid(member, referenceDate) {
  if (!member.last_payment_on) return "No payment yet";
  return `${formatCurrency(member.last_payment_amount)} · ${shortDate(member.last_payment_on, referenceDate)}`;
}

/** The two tables: what each calls its second column, and what goes in it. */
const SECTIONS = {
  expiring: {
    title: "Expiring Soon",
    whenHeader: "Days left",
    when: (member, referenceDate) => {
      const days = daysBetween(referenceDate, member.membership_end_date);
      return days === 0 ? "Last day today" : plural(days);
    },
  },
  expired: {
    title: "Expired",
    whenHeader: "Expired",
    when: (member, referenceDate) =>
      `${plural(Math.abs(daysBetween(referenceDate, member.membership_end_date)))} ago`,
  },
};

// --- HTML ---------------------------------------------------------------------

const cell = (content, { header = false, nowrap = false } = {}) =>
  `<${header ? "th" : "td"} style="padding:8px 10px 8px 0;border-bottom:1px solid ${LINE};text-align:left;vertical-align:top;font-size:14px;${
    header ? `font-weight:600;color:${MUTED};font-size:12px;` : `color:${INK};`
  }${nowrap ? "white-space:nowrap;" : ""}">${content}</${header ? "th" : "td"}>`;

function sectionHtml(kind, members, total, referenceDate) {
  const section = SECTIONS[kind];
  const heading = `<h2 style="margin:28px 0 8px;font-size:16px;font-weight:700;color:${INK};">${section.title} (${total})</h2>`;

  if (members.length === 0) {
    return `${heading}<p style="margin:0;font-size:14px;color:${MUTED};">Nobody right now.</p>`;
  }

  const rows = members
    .map(
      (member) => `<tr>
        ${cell(
          `<strong>${escapeHtml(member.full_name)}</strong><br /><span style="font-size:12px;color:${MUTED};white-space:nowrap;">${escapeHtml(member.phone)}</span>`
        )}
        ${cell(escapeHtml(shortDate(member.coverage_start_date ?? member.membership_start_date, referenceDate)))}
        ${cell(escapeHtml(shortDate(member.membership_end_date, referenceDate)))}
        ${cell(escapeHtml(section.when(member, referenceDate)), { nowrap: true })}
        ${cell(escapeHtml(lastPaid(member, referenceDate)))}
      </tr>`
    )
    .join("");

  const more = total - members.length;
  return `${heading}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        ${cell("Member", { header: true })}
        ${cell("Start", { header: true })}
        ${cell("Expiry", { header: true })}
        ${cell(section.whenHeader, { header: true })}
        ${cell("Last paid", { header: true })}
      </tr>
      ${rows}
    </table>
    ${more > 0 ? `<p style="margin:8px 0 0;font-size:13px;color:${MUTED};">…and ${more} more in the app.</p>` : ""}`;
}

// --- Plain text (for clients that do not show HTML) -----------------------------

function sectionText(kind, members, total, referenceDate) {
  const section = SECTIONS[kind];
  const lines = members.map(
    (member) =>
      `- ${member.full_name} | ${shortDate(member.coverage_start_date ?? member.membership_start_date, referenceDate)} to ${shortDate(
        member.membership_end_date,
        referenceDate
      )} | ${section.when(member, referenceDate)} | Last paid: ${lastPaid(member, referenceDate)} | ${member.phone}`
  );
  if (members.length === 0) lines.push("- Nobody right now.");
  if (total > members.length) lines.push(`- ...and ${total - members.length} more in the app.`);
  return `${section.title} (${total})\n${lines.join("\n")}`;
}

/**
 * Gathers today's lists and turns them into an email.
 *
 * @param {string} [greetingName] who the email says hello to; defaults to the
 *                                first admin
 * @returns {Promise<{ subject, html, text, counts }>}
 */
export async function buildDailyReport({ greetingName } = {}) {
  const referenceDate = today();
  const name = greetingName ?? (await getPrimaryAdmin())?.name ?? "there";

  const [stats, expiring, expired] = await Promise.all([
    getDashboardStats({ referenceDate }),
    getExpiringMembers({ referenceDate, limit: MAX_ROWS }),
    getExpiredMembers({ referenceDate, limit: MAX_ROWS }),
  ]);

  const counts = {
    expiring: stats.expiring_soon,
    expired: stats.expired,
    new: stats.new_this_month,
    total: stats.total_members,
  };
  const dateLabel = formatDate(referenceDate);
  const subject = `${APP_NAME} daily report - ${dateLabel}: ${counts.expiring} expiring soon, ${counts.expired} expired`;
  const appUrl = process.env.APP_URL?.replace(/\/$/, "");

  // The charset matters: without it some clients show "₹" and "…" as garbage.
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:24px 16px;background:#ffffff;font-family:${FONT};color:${INK};">
    <div style="max-width:620px;margin:0 auto;">
      <p style="margin:0;font-size:16px;">Hello ${escapeHtml(name)},</p>
      <p style="margin:6px 0 0;font-size:14px;color:${MUTED};">Here is your report for ${escapeHtml(dateLabel)}.</p>

      ${sectionHtml("expiring", expiring, counts.expiring, referenceDate)}
      ${sectionHtml("expired", expired, counts.expired, referenceDate)}

      <p style="margin:32px 0 0;font-size:12px;color:${MUTED};">
        ${appUrl ? `<a href="${escapeHtml(appUrl)}/dashboard" style="color:${INK};">Open the dashboard</a> · ` : ""}Sent every morning at 6:00 AM by ${escapeHtml(APP_NAME)}.
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `Hello ${name},`,
    `Here is your report for ${dateLabel}.`,
    "",
    sectionText("expiring", expiring, counts.expiring, referenceDate),
    "",
    sectionText("expired", expired, counts.expired, referenceDate),
    appUrl ? `\nOpen the dashboard: ${appUrl}/dashboard` : "",
  ].join("\n");

  return { subject, html, text, counts };
}

/**
 * Builds today's report and emails it.
 *
 * @param {string} [greetingName] see buildDailyReport
 * @returns {Promise<{ id: string, to: string, counts: object }>}
 */
export async function sendDailyReport({ to = REPORT_EMAIL_TO, greetingName } = {}) {
  const report = await buildDailyReport({ greetingName });
  const { id } = await sendEmail({
    to,
    subject: report.subject,
    html: report.html,
    text: report.text,
  });
  return { id, to, counts: report.counts };
}
