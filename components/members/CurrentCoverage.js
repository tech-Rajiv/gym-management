import Badge from "@/components/ui/Badge";
import { formatDate, daysBetween, today } from "@/lib/utils/dates";
import { describeMembership } from "@/lib/utils/membershipStatus";
import { describePayment } from "@/lib/utils/paymentStatus";
import { formatCurrency } from "@/lib/utils/format";
import styles from "./CurrentCoverage.module.css";

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * The member's current term, kept simple: the plan and its status, Start and
 * End side by side, how much of it is left, and one line on its payment.
 *
 * Used on the member's profile and in the Record Payment form.
 *
 * Dates are inclusive at both ends - a 30-day term starting Sep 01 covers
 * Sep 01 to Sep 30 - so the day counts below add one.
 */
export default function CurrentCoverage({ member, referenceDate: givenDate }) {
  if (!member.membership_id) {
    return <p className={styles.empty}>No membership on record yet.</p>;
  }

  // The payment form passes the server's date in, so the browser never has to
  // work out the gym's "today" itself.
  const referenceDate = givenDate ?? today();
  const start = member.membership_start_date;
  const end = member.membership_end_date;
  const status = describeMembership(end, referenceDate);
  const dues = describePayment(member.membership_price, member.membership_amount_paid);

  const totalDays = daysBetween(start, end) + 1;
  const daysUsed = Math.min(Math.max(daysBetween(start, referenceDate) + 1, 0), totalDays);
  const percentUsed = totalDays > 0 ? Math.round((daysUsed / totalDays) * 100) : 0;
  const notStarted = referenceDate < start;

  let progressText;
  if (status.daysRemaining < 0) {
    progressText = `Expired ${plural(Math.abs(status.daysRemaining), "day")} ago`;
  } else if (notStarted) {
    progressText = `Starts in ${plural(daysBetween(referenceDate, start), "day")}`;
  } else if (status.daysRemaining === 0) {
    progressText = "Last day today";
  } else {
    progressText = `${plural(status.daysRemaining, "day")} left`;
  }

  const paid = dues.amountPaid > 0;

  return (
    <div className={styles.coverage}>
      <div className={styles.top}>
        <span className={styles.plan}>{member.plan_name}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {/* Start and end side by side, on every screen. */}
      <div className={styles.range}>
        <div className={styles.dateBox}>
          <span className={styles.dateLabel}>Start</span>
          <span className={styles.dateValue}>{formatDate(start)}</span>
        </div>
        <div className={`${styles.dateBox} ${styles[`end_${status.variant}`] ?? ""}`}>
          <span className={styles.dateLabel}>End</span>
          <span className={styles.dateValue}>{formatDate(end)}</span>
        </div>
      </div>

      <div className={styles.progress}>
        <div
          className={styles.track}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalDays}
          aria-valuenow={daysUsed}
          aria-label="Days of this membership used"
        >
          <span
            className={`${styles.fill} ${styles[`fill_${status.variant}`] ?? ""}`}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
        <div className={styles.progressMeta}>
          <span>{plural(totalDays, "day")} plan</span>
          <strong className={styles[`text_${status.variant}`]}>{progressText}</strong>
        </div>
      </div>

      <p className={`${styles.payment} ${paid ? styles.paid : styles.unpaid}`}>
        {paid
          ? `Paid ${formatCurrency(dues.amountPaid)}${
              member.last_paid_on ? ` on ${formatDate(member.last_paid_on)}` : ""
            }`
          : `Not paid yet · plan price ${formatCurrency(dues.price)}`}
      </p>
    </div>
  );
}
