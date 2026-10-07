"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";
import SubscriptionNotice from "@/components/subscription/SubscriptionNotice";
import styles from "./SubscriptionBadge.module.css";

function crownLabel(gymName, subscription) {
  const gym = gymName || "Gym";
  if (subscription.state === "paid" || subscription.state === "expiring") {
    const days = subscription.daysLeft === 0 ? "last day" : `${subscription.daysLeft} days left`;
    return `${gym} subscription, ${days}`;
  }
  return `${gym} subscription`;
}

/**
 * The crown in a circle. The whole circle opens the cover date.
 */
export default function SubscriptionBadge({ gymName, subscription }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const renew = subscription.state === "expiring" || subscription.state === "expired" || subscription.state === "unpaid";

  return (
    <>
      <button
        type="button"
        className={`${styles.circle} ${styles[subscription.state]}`}
        aria-label={crownLabel(gymName, subscription)}
        onClick={() => setOpen(true)}
      >
        <img className={styles.crown} src="/subscription/crown.png" alt="" width={22} height={22} />
      </button>

      {open && (
        <Modal open onClose={() => setOpen(false)} label={crownLabel(gymName, subscription)}>
          <SubscriptionNotice
            gymName={gymName}
            subscription={subscription}
            actionLabel={renew ? "Renew subscription" : undefined}
            onAction={() => {
              setOpen(false);
              if (renew) router.push("/subscription/pay");
            }}
          />
        </Modal>
      )}
    </>
  );
}
