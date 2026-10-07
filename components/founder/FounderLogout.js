"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { apiRequest } from "@/lib/client/api";
import { LogOutIcon } from "@/components/ui/icons";
import styles from "./FounderLogout.module.css";

/**
 * Asks first, then ends the founder session. A stray tap on a phone
 * should not sign the founder out.
 */
export default function FounderLogout() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const handleLogout = async () => {
    setPending(true);
    await apiRequest("/api/auth/logout", { method: "POST" });
    router.replace("/founder");
    router.refresh();
  };

  return (
    <>
      <button type="button" className={styles.button} onClick={() => setConfirming(true)}>
        <LogOutIcon size={16} />
        <span className={styles.label}>Log out</span>
      </button>

      {confirming && (
        <Modal
          open
          onClose={() => setConfirming(false)}
          dismissible={!pending}
          title="Log out?"
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleLogout} disabled={pending}>
                <LogOutIcon size={15} />
                {pending ? "Logging out…" : "Log out"}
              </Button>
            </>
          }
        >
          <p>You will need your email and password to sign in again.</p>
        </Modal>
      )}
    </>
  );
}
