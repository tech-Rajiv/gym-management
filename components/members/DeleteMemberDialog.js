"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { deleteMemberAction } from "@/app/members/actions";
import styles from "./DeleteMemberDialog.module.css";

/**
 * Confirmation before deleting a member.
 *
 * Deleting removes the member's whole history and cannot be undone, so it is
 * deliberately a two-step action: the dialog names the person being deleted,
 * and the confirming button is styled as destructive.
 *
 * @param {() => void} [onDeleted] called after a successful delete, letting
 *                                 the caller decide where to go next
 */
export default function DeleteMemberDialog({ member, open, onClose, onDeleted }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteMemberAction(member.id);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      onClose();
      if (onDeleted) {
        onDeleted();
      } else {
        // Pulls fresh data for the list the user is looking at.
        router.refresh();
      }
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
      title="Delete Member?"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </>
      }
    >
      <p>
        Are you sure you want to delete{" "}
        <strong>
          {member.first_name} {member.last_name}
        </strong>
        ? Their membership history will be removed as well. This action cannot
        be undone.
      </p>
      {error && (
        <div className={styles.error}>
          <Alert>{error}</Alert>
        </div>
      )}
    </Modal>
  );
}
