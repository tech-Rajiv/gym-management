import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import DeletePaymentButton from "@/components/payments/DeletePaymentButton";
import { InboxIcon } from "@/components/ui/icons";
import { formatDate, daysBetween } from "@/lib/utils/dates";
import { describeMembership } from "@/lib/utils/membershipStatus";
import { describePayment, getMethodLabel } from "@/lib/utils/paymentStatus";
import { formatCurrency } from "@/lib/utils/format";
import styles from "./TermHistory.module.css";

/**
 * Every membership term a member has held, newest first, with the payments
 * made for each one listed underneath it.
 *
 * Grouping payments under their term is what makes the page readable: each
 * block answers "which dates did this cover, what did it cost, and when was it
 * paid?" in one place, rather than across two unrelated tables.
 *
 * Payments not tied to any term (possible for one-off charges, or when a term
 * was removed) are listed in their own block at the end.
 *
 * @param {object[]} terms    from getMembershipsByMemberId
 * @param {object[]} payments from getPaymentsByMemberId
 * @param {number}   currentTermId the term member_overview treats as current
 */
export default function TermHistory({ terms, payments, currentTermId }) {
  if (terms.length === 0 && payments.length === 0) {
    return (
      <EmptyState
        icon={<InboxIcon size={20} />}
        title="No membership history yet."
        description="Terms and the payments made for them will appear here."
      />
    );
  }

  const paymentsByTerm = new Map();
  for (const payment of payments) {
    const key = payment.membership_id ?? "none";
    paymentsByTerm.set(key, [...(paymentsByTerm.get(key) ?? []), payment]);
  }
  const looseTermPayments = paymentsByTerm.get("none") ?? [];

  return (
    <ol className={styles.timeline}>
      {terms.map((term) => {
        const termPayments = paymentsByTerm.get(term.id) ?? [];
        const amountPaid = termPayments.reduce((sum, p) => sum + Number(p.amount), 0);
        const dues = describePayment(term.price, amountPaid);
        const status = describeMembership(term.end_date);
        const isCurrent = term.id === currentTermId;
        const isCancelled = term.status === "cancelled";
        const days = daysBetween(term.start_date, term.end_date) + 1;

        return (
          <li
            key={term.id}
            className={`${styles.term} ${isCurrent ? styles.termCurrent : ""} ${
              isCancelled ? styles.termCancelled : ""
            }`}
          >
            <span className={styles.dot} aria-hidden="true" />

            <div className={styles.termHeader}>
              <div>
                <p className={styles.termTitle}>
                  {term.plan_name}
                  {isCurrent && <span className={styles.currentTag}>Current</span>}
                </p>
                <p className={styles.termDates}>
                  {formatDate(term.start_date)} → {formatDate(term.end_date)}
                  <span className={styles.termDays}> · {days} days</span>
                </p>
              </div>
              <div className={styles.badges}>
                {isCancelled ? (
                  <Badge variant="neutral">Cancelled</Badge>
                ) : (
                  <Badge variant={status.variant}>{status.label}</Badge>
                )}
                <Badge variant={dues.variant}>{dues.label}</Badge>
              </div>
            </div>

            <p className={styles.money}>
              <span>
                Price <strong>{formatCurrency(term.price)}</strong>
              </span>
              <span>
                Paid <strong>{formatCurrency(dues.amountPaid)}</strong>
              </span>
              {dues.amountDue > 0 && (
                <span className={styles.due}>
                  Due <strong>{formatCurrency(dues.amountDue)}</strong>
                </span>
              )}
            </p>

            <PaymentList payments={termPayments} />
          </li>
        );
      })}

      {looseTermPayments.length > 0 && (
        <li className={styles.term}>
          <span className={styles.dot} aria-hidden="true" />
          <p className={styles.termTitle}>Other payments</p>
          <p className={styles.termDates}>Not linked to a membership term</p>
          <PaymentList payments={looseTermPayments} />
        </li>
      )}
    </ol>
  );
}

/** The payments made for one term, oldest first - the order they happened. */
function PaymentList({ payments }) {
  if (payments.length === 0) {
    return <p className={styles.noPayments}>No payment recorded for this term.</p>;
  }

  const ordered = [...payments].sort((a, b) =>
    a.paid_on === b.paid_on ? a.id - b.id : a.paid_on < b.paid_on ? -1 : 1
  );

  return (
    <ul className={styles.payments}>
      {ordered.map((payment) => (
        <li key={payment.id} className={styles.payment}>
          <div className={styles.paymentMain}>
            <span className={styles.paymentAmount}>{formatCurrency(payment.amount)}</span>
            <span className={styles.paymentMeta}>
              paid on <strong>{formatDate(payment.paid_on)}</strong> by{" "}
              {getMethodLabel(payment.method)}
              {payment.reference ? ` · UTR ${payment.reference}` : ""}
            </span>
            {payment.remark && <span className={styles.remark}>{payment.remark}</span>}
          </div>
          <DeletePaymentButton payment={payment} />
        </li>
      ))}
    </ul>
  );
}
