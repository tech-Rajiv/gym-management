import Button from "@/components/ui/Button";
import MemberRowMenu from "./MemberRowMenu";
import { RupeeIcon } from "@/components/ui/icons";
import styles from "./MemberActions.module.css";

/**
 * The actions in the member page's header: Add Payment, the one used every
 * day, as a compact button; Edit and Mark as left (or Restore) in the "⋯"
 * menu beside it.
 */
export default function MemberActions({ member }) {
  const isLeft = member.member_status === "left";

  return (
    <div className={styles.actions}>
      {!isLeft && (
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
