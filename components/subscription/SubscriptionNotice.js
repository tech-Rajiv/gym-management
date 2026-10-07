"use client";

import Button from "@/components/ui/Button";
import styles from "./SubscriptionNotice.module.css";

function coverDate(value) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00Z`));
}

function daysValue(subscription) {
  const days = subscription?.daysLeft;
  if (subscription?.state === "unpaid" || days == null) return "—";
  if (days < 0) return "Ended";
  if (days === 0) return "Today";
  return String(days);
}

function leadFor(gymName, subscription) {
  const gym = gymName || "This gym";
  if (subscription?.state === "expired") {
    return `You are signed in. Cover for ${gym} has ended, so the gym stays closed.`;
  }
  return `You are signed in. ${gym} stays closed until the software is paid.`;
}

/**
 * Cover details for one gym, laid out as a short record: who, until when,
 * and how many days are left. A button appears only when the owner needs to pay.
 */
export default function SubscriptionNotice({
  gymName,
  subscription,
  mode = "status",
  price,
  priceNote,
  actionLabel,
  onAction,
  pending = false,
}) {
  const state = subscription?.state || "unpaid";
  const covered = state === "paid" || state === "expiring";
  const heading = state === "expired" ? "Cover ended" : "Subscription needed";

  return (
    <div className={`${styles.notice} ${styles[state]}`}>
      <div className={styles.head}>
        <span className={styles.mark}>
          <img src="/subscription/crown.png" alt="" width={28} height={28} />
        </span>
        <div className={styles.identity}>
          <p className={styles.kicker}>{covered ? "Software cover" : heading}</p>
          <h2 className={styles.gym}>{gymName || "This gym"}</h2>
        </div>
      </div>

      {!covered && mode !== "pay" && <p className={styles.lead}>{leadFor(gymName, subscription)}</p>}

      <dl className={styles.rows}>
        <div>
          <dt>Covered until</dt>
          <dd>{coverDate(subscription?.paidUntil)}</dd>
        </div>
        <div>
          <dt>Days remaining</dt>
          <dd className={state === "expiring" ? styles.warn : undefined}>{daysValue(subscription)}</dd>
        </div>
        {price && (
          <div>
            <dt>To pay</dt>
            <dd>{price}</dd>
          </div>
        )}
      </dl>

      {priceNote && <p className={styles.note}>{priceNote}</p>}

      {actionLabel && (
        <Button type="button" variant="primary" fullWidth onClick={onAction} disabled={pending}>
          {pending ? "Opening payment…" : actionLabel}
        </Button>
      )}
    </div>
  );
}
