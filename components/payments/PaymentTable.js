"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import RowMenu from "@/components/ui/RowMenu";
import DownloadPdfButton from "@/components/ui/DownloadPdfButton";
import DeletePaymentDialog from "./DeletePaymentDialog";
import {
  CardIcon,
  SearchIcon,
  TrashIcon,
  EyeIcon,
  RupeeIcon,
  ArrowRightIcon,
} from "@/components/ui/icons";
import { formatDate, today, addDays } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/format";
import { getMethodLabel } from "@/lib/utils/paymentStatus";
import styles from "./PaymentTable.module.css";

/**
 * A day's heading: "Today · Mon, Oct 05", "Yesterday · Sun, Oct 04", or
 * "Sat, Oct 03" - with the year added when it is not this year.
 */
function dayHeading(date, todayDate) {
  const at = new Date(`${date}T00:00:00Z`);
  const sameYear = date.slice(0, 4) === todayDate.slice(0, 4);
  const label = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: "UTC",
  }).format(at);
  if (date === todayDate) return { relative: "Today", label };
  if (date === addDays(todayDate, -1)) return { relative: "Yesterday", label };
  return { relative: null, label };
}

/** The payments, newest first, gathered under one heading per day. */
function groupByDay(payments) {
  const days = [];
  for (const payment of payments) {
    const last = days.at(-1);
    if (last?.date === payment.paid_on) last.payments.push(payment);
    else days.push({ date: payment.paid_on, payments: [payment] });
  }
  return days;
}

/**
 * Payment history as payment records - like a bank statement:
 *
 *   Today · Mon, Oct 05                    ₹5,500 · 2 payments  [⬇]
 *   ┌───────────────────────────────────────────────────────────┐
 *   │ [₹]  Parmar shiv Shiv                          ₹4,000   ⋯ │
 *   └───────────────────────────────────────────────────────────┘
 *       (a gap, then the next day)
 *        Quarterly · Oct 05, 2026 → Jan 02, 2027
 *        [Cash]  remark
 *
 * Each day's PDF button downloads just that day's payments. Tapping a record
 * opens the payment's own page; View member and Delete payment are also in
 * its "⋯" menu.
 *
 * A Client Component because deleting opens a dialog, which needs state.
 */
export default function PaymentTable({ payments, isSearching = false, addHref = "/payments/new" }) {
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  if (payments.length === 0) {
    return isSearching ? (
      <EmptyState
        icon={<SearchIcon size={20} />}
        title="No payments found."
        description="No payments match these filters. Try a different search or period."
      />
    ) : (
      <EmptyState
        icon={<CardIcon size={20} />}
        title="No payments recorded yet."
        description="Record your first payment to start building a history."
        action={
          <Button href={addHref} variant="primary" size="small">
            Record Payment
          </Button>
        }
      />
    );
  }

  const todayDate = today();

  return (
    <>
      <div className={styles.days}>
        {groupByDay(payments).map((day) => {
          const total = day.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
          const heading = dayHeading(day.date, todayDate);
          const headingText = heading.relative ? `${heading.relative}, ${heading.label}` : heading.label;
          return (
            <section key={day.date} className={styles.day} aria-label={headingText}>
              {/* The date as a plain heading above the day's own box. */}
              <header className={styles.dayHeader}>
                <h3 className={styles.dayTitle}>
                  {heading.relative && <span className={styles.relative}>{heading.relative}</span>}
                  {heading.label}
                </h3>
                <span className={styles.dayTotal}>
                  {formatCurrency(total)}
                  <span className={styles.dayCount}>
                    {" "}· {day.payments.length} {day.payments.length === 1 ? "payment" : "payments"}
                  </span>
                </span>
                <DownloadPdfButton
                  list="payments"
                  params={{ from: day.date, to: day.date }}
                  title={`Payments on ${formatDate(day.date)}`}
                  description="will be saved as a PDF - every payment received that day, with all its details."
                  iconOnly
                  className={styles.dayPdf}
                />
              </header>

              <ul className={styles.list}>
                {day.payments.map((payment) => (
                  <PaymentRecord
                    key={payment.id}
                    payment={payment}
                    onDelete={() => setPaymentToDelete(payment)}
                  />
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {paymentToDelete && (
        <DeletePaymentDialog
          payment={paymentToDelete}
          open
          onClose={() => setPaymentToDelete(null)}
        />
      )}
    </>
  );
}

/** One payment record. */
function PaymentRecord({ payment, onDelete }) {
  const isUpi = payment.method === "upi";

  return (
    <li className={styles.record}>
      <span className={styles.icon} aria-hidden="true">
        <RupeeIcon size={18} />
      </span>

      <div className={styles.details}>
        <div className={styles.topLine}>
          {/* Stretched over the whole record: a tap anywhere opens the payment. */}
          <Link
            href={`/payments/${payment.id}`}
            className={styles.cover}
            aria-label={`Payment of ${formatCurrency(payment.amount)} from ${payment.member_name}`}
          >
            <span className={styles.member}>{payment.member_name}</span>
          </Link>
          <span className={styles.amount}>{formatCurrency(payment.amount)}</span>
        </div>

        <p className={styles.term}>
          {payment.plan_name ? (
            <>
              <span className={styles.plan}>{payment.plan_name}</span>
              {" · "}
              {formatDate(payment.membership_start_date)} → {formatDate(payment.membership_end_date)}
            </>
          ) : (
            "Not linked to a membership"
          )}
        </p>

        <div className={styles.meta}>
          <Badge variant={isUpi ? "primary" : "neutral"} dot={false}>
            {getMethodLabel(payment.method)}
          </Badge>
          {payment.reference && <span className={styles.reference}>UTR {payment.reference}</span>}
          {payment.remark && <span className={styles.remark}>{payment.remark}</span>}
        </div>
      </div>

      <div className={styles.menu}>
        <RowMenu
          label={`More for the payment from ${payment.member_name}`}
          items={[
            { label: "View payment", icon: <ArrowRightIcon size={16} />, href: `/payments/${payment.id}` },
            { label: "View member", icon: <EyeIcon size={16} />, href: `/members/${payment.member_id}` },
            { label: "Delete payment", icon: <TrashIcon size={16} />, onClick: onDelete, danger: true },
          ]}
        />
      </div>
    </li>
  );
}
