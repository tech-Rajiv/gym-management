"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Toast, { Spinner, useToast } from "@/components/ui/Toast";
import { apiRequest } from "@/lib/client/api";
import { MailIcon } from "@/components/ui/icons";
import styles from "./EmailReportButton.module.css";

/**
 * "Email me the report" - sends the daily report now, the same email the
 * 6 AM schedule sends, so the admin can see what arrives each morning.
 *
 *   1. a click asks first: "Send today's report?" naming the address
 *   2. while it sends, the button spins and a "Sending report…" message shows
 *   3. then "✓ Report sent to …" (or why it was not), which clears itself
 *
 * @param {string} to the address the report goes to, worked out on the server
 */
export default function EmailReportButton({ to }) {
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useToast();
  const sending = toast.status === "loading";

  const send = async () => {
    setConfirming(false);
    setToast({ status: "loading", message: "Sending report…" });
    const result = await apiRequest("/api/reports/daily", { method: "POST" });
    setToast(
      result.ok
        ? { status: "done", message: `Report sent to ${result.to}` }
        : { status: "error", message: result.message ?? "The report could not be sent." }
    );
  };

  return (
    <>
      <button
        type="button"
        className={styles.button}
        onClick={() => setConfirming(true)}
        disabled={sending}
      >
        {sending ? <Spinner /> : <MailIcon size={16} />}
        {sending ? "Sending…" : "Email me the report"}
      </button>

      {confirming && (
        <Modal
          open
          onClose={() => setConfirming(false)}
          title="Send today's report?"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={send}>
                <MailIcon size={15} />
                Send report
              </Button>
            </>
          }
        >
          <p>
            Today&apos;s report - Expiring Soon and Expired - will be emailed to{" "}
            <strong>{to}</strong>. It is the same email that arrives every
            morning at 6:00 AM.
          </p>
        </Modal>
      )}

      <Toast toast={toast} />
    </>
  );
}
