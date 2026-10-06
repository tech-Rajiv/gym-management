import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { CardIcon, RupeeIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/format";
import { getMethodLabel } from "@/lib/utils/paymentStatus";
import styles from "./MemberPayments.module.css";

/**
 * Every payment this member has made, newest first. Each one opens its own
 * payment page (full details, receipt PDF, delete).
 *
 *   [₹]  ₹4,000                                   Mar 04, 2026   ›
 *        Half Yearly · Mar 02, 2026 → Aug 29, 2026 · Cash
 */
export default function MemberPayments({ payments }) {
  if (payments.length === 0) {
    return (
      <EmptyState
        icon={<CardIcon size={20} />}
        title="No payments yet."
        description="Payments recorded for this member will appear here."
      />
    );
  }

  return (
    <ul className={styles.list}>
      {payments.map((payment) => (
        <li key={payment.id}>
          {/* "from=member" makes the payment page's back link return here. */}
          <Link href={`/payments/${payment.id}?from=member`} className={styles.row}>
            <span className={styles.icon} aria-hidden="true">
              <RupeeIcon size={16} />
            </span>
            <span className={styles.main}>
              <span className={styles.topLine}>
                <strong className={styles.amount}>{formatCurrency(payment.amount)}</strong>
                <span className={styles.date}>{formatDate(payment.paid_on)}</span>
              </span>
              <span className={styles.meta}>
                {payment.plan_name
                  ? `${payment.plan_name} · ${formatDate(payment.membership_start_date)} → ${formatDate(
                      payment.membership_end_date
                    )}`
                  : "Not linked to a membership"}
                {` · ${getMethodLabel(payment.method)}`}
              </span>
            </span>
            <svg className={styles.chevron} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </li>
      ))}
    </ul>
  );
}
