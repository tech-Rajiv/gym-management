"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DownloadPdfButton from "@/components/ui/DownloadPdfButton";
import DeletePaymentDialog from "./DeletePaymentDialog";
import { TrashIcon } from "@/components/ui/icons";
import styles from "./PaymentDetailActions.module.css";

/**
 * Download receipt (PDF) and Delete, on a payment's own page. After a delete
 * the payment no longer exists, so the page goes back to where it was opened
 * from - Payment History, or the member's profile.
 */
export default function PaymentDetailActions({ payment, afterDelete = "/payments" }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  return (
    <div className={styles.actions}>
      <DownloadPdfButton
        list="payment"
        params={{ id: payment.id }}
        title={`Receipt #${payment.id}`}
        description={`will be saved as a PDF receipt for this payment from ${payment.member_name}.`}
      />
      <button type="button" className={styles.delete} onClick={() => setDeleting(true)}>
        <TrashIcon size={15} />
        Delete
      </button>

      {deleting && (
        <DeletePaymentDialog
          payment={payment}
          open
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            router.push(afterDelete);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
