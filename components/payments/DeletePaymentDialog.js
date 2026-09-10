"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { deletePaymentAction } from "@/app/payments/actions";
import { formatDate } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/format";
import styles from "./DeletePaymentDialog.module.css";

/**
 * Confirmation before deleting a payment record.
 *
 * The dialog spells out that the membership itself is untouched, because that
 * is the thing an owner would reasonably worry about: correcting a mistyped
 * receipt should never take away somebody's gym access.
 */
export default function DeletePaymentDialog({ payment, open, onClose }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deletePaymentAction(payment.id);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      onClose();
      router.refresh();
    });
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      dismissible={!isPending}
      title="Delete Payment?"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting…" : "Delete"}
          </Button>
        </>
      }
    >
      {error && <Alert variant="danger">{error}</Alert>}

      <p className={styles.text}>
        Are you sure you want to delete the{" "}
        <strong className={styles.amount}>{formatCurrency(payment.amount)}</strong>{" "}
        payment from <strong>{payment.member_name}</strong> on{" "}
        {formatDate(payment.paid_on)}?
      </p>
      <p className={styles.hint}>
        Their membership dates are not affected — the term will simply show as
        unpaid again. This action cannot be undone.
      </p>
    </Modal>
  );
}
