import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/format";
import { getMethodLabel } from "@/lib/utils/paymentStatus";
import tableStyles from "@/components/ui/Table.module.css";
import styles from "./PaymentTable.module.css";

/**
 * One row of the payment history.
 *
 * A Server Component - it only renders. The delete button beside it is the
 * one interactive part, so it is passed in from the client table above.
 *
 * Every cell carries a `data-label`, which is what turns the row into a
 * stacked card below 768px. See components/ui/Table.module.css.
 */
export default function PaymentRow({ payment, showMember = true, actions }) {
  return (
    <tr>
      <td>
        <span className={styles.date}>{formatDate(payment.paid_on)}</span>
        {showMember && (
          <span className={styles.member}>{payment.member_name}</span>
        )}
      </td>

      {showMember && (
        <td data-label="Phone" className={tableStyles.muted}>
          {payment.member_phone}
        </td>
      )}

      <td data-label="For">
        {payment.plan_name ? (
          <>
            <span>{payment.plan_name}</span>
            <span className={styles.term}>
              {formatDate(payment.membership_start_date)} –{" "}
              {formatDate(payment.membership_end_date)}
            </span>
          </>
        ) : (
          <span className={tableStyles.muted}>—</span>
        )}
      </td>

      <td data-label="Method">
        <Badge variant={payment.method === "upi" ? "primary" : "neutral"} dot={false}>
          {getMethodLabel(payment.method)}
        </Badge>
        {payment.reference && (
          <span className={styles.reference}>{payment.reference}</span>
        )}
      </td>

      <td data-label="Remark" className={`${tableStyles.muted} ${styles.remarkCell}`}>
        {payment.remark || "—"}
      </td>

      <td data-label="Amount" className={`${tableStyles.numeric} ${styles.amount}`}>
        {formatCurrency(payment.amount)}
      </td>

      {actions && <td className={tableStyles.actionsCell}>{actions}</td>}
    </tr>
  );
}
