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

/** A gym that has never paid has no cover date to show. */
function isNewGym(subscription) {
  return (subscription?.state || "unpaid") === "unpaid" && !subscription?.paidUntil;
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
  coverStarts,
  coverEnds,
  actionLabel,
  onAction,
  pending = false,
}) {
  const state = subscription?.state || "unpaid";
  const covered = state === "paid" || state === "expiring";
  const fresh = isNewGym(subscription);
  const gym = gymName || "This gym";
  const heading = state === "expired" ? "Cover ended" : "Subscription needed";

  return (
    <div className={`${styles.notice} ${styles[state]} ${fresh ? styles.welcome : ""}`}>
      <div className={styles.head}>
        <span className={styles.mark}>
          <img src="/subscription/crown.png" alt="" width={28} height={28} />
        </span>
        <div className={styles.identity}>
          <p className={styles.kicker}>{fresh ? "Welcome" : covered ? "Software cover" : heading}</p>
          <h2 className={styles.gym}>{gym}</h2>
        </div>
      </div>

      {fresh && (
        <p className={styles.lead}>
          Welcome to {gym}. If you pay now, cover runs for these dates.
        </p>
      )}

      {!fresh && mode === "pay" && coverStarts && (
        <p className={styles.lead}>If you pay now, cover runs for these dates.</p>
      )}

      {!fresh && !covered && mode !== "pay" && <p className={styles.lead}>{leadFor(gymName, subscription)}</p>}

      {(fresh ? price || coverStarts : true) && (
      <dl className={styles.rows}>
        {coverStarts && coverEnds ? (
          <>
            <div>
              <dt>Cover starts</dt>
              <dd>{coverDate(coverStarts)}</dd>
            </div>
            <div>
              <dt>Cover ends</dt>
              <dd>{coverDate(coverEnds)}</dd>
            </div>
          </>
        ) : (
          !fresh && (
            <>
              <div>
                <dt>Covered until</dt>
                <dd>{coverDate(subscription?.paidUntil)}</dd>
              </div>
              <div>
                <dt>Days remaining</dt>
                <dd className={state === "expiring" ? styles.warn : undefined}>{daysValue(subscription)}</dd>
              </div>
            </>
          )
        )}
        {price && (
          <div>
            <dt>To pay</dt>
            <dd>{price}</dd>
          </div>
        )}
      </dl>
      )}

      {priceNote && <p className={styles.note}>{priceNote}</p>}

      {actionLabel && (
        <Button type="button" variant="primary" fullWidth onClick={onAction} disabled={pending}>
          {pending ? "Opening payment…" : actionLabel}
        </Button>
      )}
    </div>
  );
}
