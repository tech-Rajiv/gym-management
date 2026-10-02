"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import { apiRequest } from "@/lib/client/api";
import styles from "./MemberStatusDialog.module.css";

/**
 * Confirmation before marking a member as left, or bringing them back.
 *
 * Neither deletes anything. "Left" takes the member off the everyday lists and
 * the dashboard while their record, memberships and payments stay on file; it
 * is undone from the Left filter with "Restore".
 *
 * @param {'left'|'restore'} mode
 * @param {() => void} [onDone] called after success, letting the caller decide
 *                              where to go next; refreshes the page otherwise
 */
export default function MemberStatusDialog({ member, mode, open, onClose, onDone }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const isLeaving = mode === "left";
  const name = `${member.first_name} ${member.last_name}`;

  const handleConfirm = async () => {
    setError(null);
    setPending(true);

    const result = isLeaving
      ? await apiRequest(`/api/members/${member.id}`, { method: "DELETE" })
      : await apiRequest(`/api/members/${member.id}/restore`, { method: "POST" });

    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }

    onClose();
    if (onDone) onDone();
    router.refresh();
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      dismissible={!pending}
      title={isLeaving ? "Mark member as left?" : "Restore member?"}
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant={isLeaving ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending ? "Saving…" : isLeaving ? "Mark as left" : "Restore"}
          </Button>
        </>
      }
    >
      {isLeaving ? (
        <p>
          <strong className={styles.name}>{name}</strong> will be marked as having
          left the gym. They move to the <strong>Left</strong> list and stop
          counting on the dashboard. Nothing is deleted — their details,
          membership history and payments are all kept, and you can restore them
          later.
        </p>
      ) : (
        <p>
          <strong className={styles.name}>{name}</strong> will be moved back to the
          active members list. Their history carries on as before.
        </p>
      )}
      {error && (
        <div className={styles.error}>
          <Alert>{error}</Alert>
        </div>
      )}
    </Modal>
  );
}
