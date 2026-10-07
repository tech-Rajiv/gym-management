import Button from "@/components/ui/Button";
import MemberRowMenu from "./MemberRowMenu";
import { RupeeIcon } from "@/components/ui/icons";
import { getMembershipStatus, MEMBERSHIP_STATUS } from "@/lib/utils/membershipStatus";
import styles from "./MemberActions.module.css";

/**
 * The actions in the member page's header: Add Payment as a compact button,
 * and Edit and Mark as left (or Restore) in the "⋯" menu beside it.
 *
 * Add Payment only shows when a payment is actually due - the membership is
 * expiring soon, has expired, or there is none. A member with weeks left does
 * not need a payment button in their face (an advance payment can still be
 * recorded from Payments -> New Payment).
 */
export default function MemberActions({ member }) {
  const isLeft = member.member_status === "left";
  const status = getMembershipStatus(member.membership_end_date);
  const paymentDue = status !== MEMBERSHIP_STATUS.ACTIVE;

  return (
    <div className={styles.actions}>
      {!isLeft && paymentDue && (
        <Button href={`/payments/new?member=${member.id}`} variant="primary" size="small" className={styles.pay}>
          <RupeeIcon size={15} />
          Add Payment
        </Button>
      )}
      <div className={styles.menu}>
        <MemberRowMenu member={member} showView={false} />
      </div>
    </div>
  );
}
