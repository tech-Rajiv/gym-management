"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import PaymentRow from "./PaymentRow";
import DeletePaymentDialog from "./DeletePaymentDialog";
import { CardIcon, SearchIcon, TrashIcon } from "@/components/ui/icons";
import tableStyles from "@/components/ui/Table.module.css";
import styles from "./PaymentTable.module.css";

/**
 * The payment history table.
 *
 * A Client Component only because deleting opens a dialog, which needs state.
 * The rows themselves are Server Components rendered above and passed through,
 * so no payment data is turned into client-side JavaScript beyond what the
 * dialog needs.
 *
 * @param {boolean} showMember   hidden on a member's own page, where every row
 *                               is obviously theirs
 * @param {string}  [addHref]    where the empty state's button should lead
 */
export default function PaymentTable({
  payments,
  isSearching = false,
  showMember = true,
  addHref = "/payments/new",
}) {
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  if (payments.length === 0) {
    return isSearching ? (
      <EmptyState
        icon={<SearchIcon size={20} />}
        title="No payments found."
        description="No payments match your search. Try a different name, phone number or reference."
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

  return (
    <>
      <div className={tableStyles.wrapper}>
        <table className={`${tableStyles.table} ${styles.wide}`}>
          <thead>
            <tr>
              <th>{showMember ? "Date / Member" : "Date"}</th>
              {showMember && <th>Phone</th>}
              <th>For</th>
              <th>Method</th>
              <th>Remark</th>
              <th className={tableStyles.numeric}>Amount</th>
              <th>
                <span className={tableStyles.srOnly}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                showMember={showMember}
                actions={
                  <button
                    type="button"
                    onClick={() => setPaymentToDelete(payment)}
                    className={tableStyles.actionButton}
                    aria-label={`Delete payment from ${payment.member_name}`}
                    title="Delete"
                  >
                    <TrashIcon size={15} />
                  </button>
                }
              />
            ))}
          </tbody>
        </table>
      </div>

      {paymentToDelete && (
        <DeletePaymentDialog
          payment={paymentToDelete}
          open={Boolean(paymentToDelete)}
          onClose={() => setPaymentToDelete(null)}
        />
      )}
    </>
  );
}
