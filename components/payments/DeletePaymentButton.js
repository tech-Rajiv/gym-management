"use client";

import { useState } from "react";
import DeletePaymentDialog from "./DeletePaymentDialog";
import { TrashIcon } from "@/components/ui/icons";
import tableStyles from "@/components/ui/Table.module.css";

/**
 * A delete button with its confirmation dialog, for places that list payments
 * outside the payment table - the member page's term history.
 */
export default function DeletePaymentButton({ payment }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`${tableStyles.actionButton} ${tableStyles.deleteButton}`}
        aria-label={`Delete payment of ${payment.amount} on ${payment.paid_on}`}
        title="Delete payment"
      >
        <TrashIcon size={15} />
      </button>

      {open && (
        <DeletePaymentDialog payment={payment} open onClose={() => setOpen(false)} />
      )}
    </>
  );
}
