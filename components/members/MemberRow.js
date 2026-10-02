import Link from "next/link";
import Badge from "@/components/ui/Badge";
import MemberCard from "./MemberCard";
import {
  EyeIcon,
  EditIcon,
  UserMinusIcon,
  RestoreIcon,
  CardIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/utils/dates";
import { describeMembership, MEMBERSHIP_STATUS } from "@/lib/utils/membershipStatus";
import { describePayment, getMethodLabel } from "@/lib/utils/paymentStatus";
import { formatCurrency } from "@/lib/utils/format";
import tableStyles from "@/components/ui/Table.module.css";
import styles from "./MemberTable.module.css";

/**
 * One row of the members table.
 *
 * The status shown here is worked out from the membership end date every time
 * the row renders, so it is correct the moment the page loads and needs no
 * stored value to be kept up to date.
 *
 * A member who has left the gym is faded and shows "Left" instead of their
 * membership status, so they cannot be mistaken for a current member.
 *
 * @param {(member, mode: 'left'|'restore') => void} onChangeStatus
 */
export default function MemberRow({ member, onChangeStatus }) {
  const isLeft = member.member_status === "left";
  const membership = describeMembership(member.membership_end_date);
  // What the member still owes on that term. Derived, never stored - see
  // lib/utils/paymentStatus.js.
  const payment = describePayment(
    member.membership_price,
    member.membership_amount_paid
  );

  // An expired, expiring or missing membership is the moment to take a
  // renewal, so the row offers the payment form with this member selected.
  const needsRenewal =
    !isLeft &&
    (membership.status === MEMBERSHIP_STATUS.EXPIRED ||
      membership.status === MEMBERSHIP_STATUS.EXPIRING_SOON ||
      membership.status === MEMBERSHIP_STATUS.NONE);

  return (
    <tr className={isLeft ? styles.leftRow : undefined}>
      <td>
        <Link href={`/members/${member.id}`} className={styles.name}>
          {member.full_name}
        </Link>
        <p className={styles.subtext}>{member.phone}</p>
      </td>
      <td
        data-label="Joined"
        className={`${tableStyles.muted} ${tableStyles.numeric} ${styles.joinColumn}`}
      >
        {formatDate(member.join_date)}
      </td>
      <td data-label="Expires" className={tableStyles.numeric}>
        <span className={styles.statusStack}>
          <span>{member.membership_end_date ? formatDate(member.membership_end_date) : "—"}</span>
          {member.plan_name && (
            <span className={styles.subtext}>{member.plan_name} plan</span>
          )}
        </span>
      </td>
      <td data-label="Status">
        {isLeft ? (
          <span className={styles.statusStack}>
            <Badge variant="neutral">Left</Badge>
            {member.left_on && (
              <span className={styles.subtext}>on {formatDate(member.left_on)}</span>
            )}
          </span>
        ) : (
          <Badge variant={membership.variant}>{membership.label}</Badge>
        )}
      </td>

      {/* The last money received, e.g. "Paid ₹4,000 on Sep 22, 2026", with
          anything still owed on the current term underneath. */}
      <td data-label="Last payment">
        {member.last_payment_on ? (
          <span className={styles.statusStack}>
            <span className={styles.lastPayment}>
              Paid <strong>{formatCurrency(member.last_payment_amount)}</strong>
              {payment.amountDue > 0 && (
                <span className={styles.due}> · {formatCurrency(payment.amountDue)} due</span>
              )}
            </span>
            <span className={styles.subtext}>
              on {formatDate(member.last_payment_on)} · {getMethodLabel(member.last_payment_method)}
            </span>
          </span>
        ) : (
          <span className={styles.noPayment}>No payment yet</span>
        )}
      </td>
      <td className={tableStyles.actionsCell}>
        <span className={tableStyles.actions}>
          {needsRenewal && (
            <Link
              href={`/payments/new?member=${member.id}`}
              className={tableStyles.payAction}
              aria-label={`Add payment for ${member.full_name}`}
            >
              <CardIcon size={15} />
              Add payment
            </Link>
          )}
          <Link
            href={`/members/${member.id}`}
            className={tableStyles.actionButton}
            title="View member"
            aria-label={`View ${member.full_name}`}
          >
            <EyeIcon size={15} />
          </Link>
          <Link
            href={`/members/${member.id}/edit`}
            className={tableStyles.actionButton}
            title="Edit member"
            aria-label={`Edit ${member.full_name}`}
          >
            <EditIcon size={15} />
          </Link>
          {isLeft ? (
            <button
              type="button"
              onClick={() => onChangeStatus(member, "restore")}
              className={tableStyles.actionButton}
              title="Restore member"
              aria-label={`Restore ${member.full_name}`}
            >
              <RestoreIcon size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onChangeStatus(member, "left")}
              className={`${tableStyles.actionButton} ${tableStyles.deleteButton}`}
              title="Mark as left"
              aria-label={`Mark ${member.full_name} as left`}
            >
              <UserMinusIcon size={15} />
            </button>
          )}
        </span>
      </td>
    </tr>
  );
}

/**
 * The same member as a phone card (see MemberCard): status pill on the right,
 * Call / WhatsApp / Renew underneath, and Edit and Mark-as-left (or Restore)
 * as icon buttons. Renew shows when the membership has expired, is expiring
 * soon, or there is none.
 */
export function MemberRowCard({ member, onChangeStatus }) {
  const isLeft = member.member_status === "left";
  const membership = describeMembership(member.membership_end_date);
  const payment = describePayment(member.membership_price, member.membership_amount_paid);
  const needsRenewal =
    !isLeft &&
    (membership.status === MEMBERSHIP_STATUS.EXPIRED ||
      membership.status === MEMBERSHIP_STATUS.EXPIRING_SOON ||
      membership.status === MEMBERSHIP_STATUS.NONE);

  return (
    <MemberCard
      member={member}
      faded={isLeft}
      lines={[
        [member.plan_name, member.membership_end_date && `Expires ${formatDate(member.membership_end_date)}`]
          .filter(Boolean)
          .join(" · "),
        `${member.phone} · Joined ${formatDate(member.join_date)}`,
        member.last_payment_on
          ? `Last paid ${formatCurrency(member.last_payment_amount)} on ${formatDate(member.last_payment_on)}${
              payment.amountDue > 0 ? ` · ${formatCurrency(payment.amountDue)} due` : ""
            }`
          : "No payment yet",
      ]}
      status={
        isLeft ? (
          <Badge variant="neutral">Left</Badge>
        ) : (
          <Badge variant={membership.variant}>{membership.label}</Badge>
        )
      }
      statusDetail={isLeft && member.left_on ? `on ${formatDate(member.left_on)}` : null}
      renew={needsRenewal}
      extra={
        <>
          <Link
            href={`/members/${member.id}/edit`}
            className={tableStyles.actionButton}
            aria-label={`Edit ${member.full_name}`}
          >
            <EditIcon size={15} />
          </Link>
          {isLeft ? (
            <button
              type="button"
              onClick={() => onChangeStatus(member, "restore")}
              className={tableStyles.actionButton}
              aria-label={`Restore ${member.full_name}`}
            >
              <RestoreIcon size={15} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onChangeStatus(member, "left")}
              className={`${tableStyles.actionButton} ${tableStyles.deleteButton}`}
              aria-label={`Mark ${member.full_name} as left`}
            >
              <UserMinusIcon size={15} />
            </button>
          )}
        </>
      }
    />
  );
}
