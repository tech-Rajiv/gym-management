import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import { PhoneIcon, WhatsAppIcon, RupeeIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils/dates";
import { describeMembership } from "@/lib/utils/membershipStatus";
import { telHref, whatsAppHref } from "@/lib/utils/format";
import { APP_NAME } from "@/lib/config";
import styles from "./MemberListItem.module.css";

const plural = (count) => `${count} day${count === 1 ? "" : "s"}`;

/** "3 days left", "Last day today" or "Expired 3 days ago". */
function remainingText(daysRemaining) {
  if (daysRemaining === 0) return "Last day today";
  return daysRemaining > 0
    ? `${plural(daysRemaining)} left`
    : `Expired ${plural(Math.abs(daysRemaining))} ago`;
}

/**
 * The WhatsApp message typed in for the admin, ready to send. Members who are
 * expired or about to be get a friendly payment reminder with their name,
 * plan and date; anyone else gets a plain greeting.
 */
function whatsAppMessage(member, membership) {
  const firstName = member.full_name.split(" ")[0];
  const plan = member.plan_name ? `${member.plan_name} ` : "";
  const date = formatDate(member.membership_end_date);
  const days = membership.daysRemaining;

  if (days === null) return `Hi ${firstName}, this is ${APP_NAME}.`;

  if (days < 0) {
    return (
      `Hi ${firstName}, this is ${APP_NAME}. Your ${plan}membership expired on ${date}. ` +
      `Please renew it to continue your training - you can pay by cash or UPI at the desk. Thank you!`
    );
  }
  if (membership.status === "expiring_soon") {
    const when = days === 0 ? "today" : `on ${date} (in ${plural(days)})`;
    return (
      `Hi ${firstName}, this is a friendly reminder from ${APP_NAME}. Your ${plan}membership ` +
      `expires ${when}. Please renew to keep training without a break - you can pay by cash ` +
      `or UPI at the desk. Thank you!`
    );
  }
  return `Hi ${firstName}, this is ${APP_NAME}.`;
}

/**
 * One member as a clean list row - the design shared by the dashboard's
 * Expired / Expiring Soon lists and the Members page:
 *
 *   Name [status]                                          [⋯ menu]
 *   Monthly · Sep 06, 2026 → Oct 05, 2026
 *   3 days left
 *   [an optional extra line, e.g. the last payment]
 *   [ Renew Payment ]  [ Call ]  [ WhatsApp ]
 *
 * Only the three everyday actions sit on the row, each a roomy labelled
 * button; anything less frequent (View, Edit, Mark as left) goes in the menu
 * passed in. Call opens the phone's dialler and WhatsApp opens a chat with a
 * reminder already written - neither shows the number itself. Renew opens
 * the payment form with the member selected.
 *
 * Presentational only, so Server and Client Components can both render it.
 *
 * @param {object}  member  id, full_name, phone, photo_url, plan_name,
 *                          membership_start_date, membership_end_date
 * @param {boolean} [renew]  show Renew; defaults to expired / expiring / none
 * @param {node}    [status] replaces the membership badge (e.g. "Left")
 * @param {node}    [note]   replaces the "3 days left" line
 * @param {node}    [extra]  one more muted line under the details
 * @param {node}    [menu]   the row's menu (RowMenu), at its top-right
 * @param {boolean} [faded]  a member who has left the gym
 */
export default function MemberListItem({
  member,
  renew,
  status,
  note,
  extra,
  menu,
  faded = false,
}) {
  const membership = describeMembership(member.membership_end_date);
  const showRenew = renew ?? ["expired", "expiring_soon", "none"].includes(membership.status);
  const hasTerm = Boolean(member.membership_end_date);
  // The avatar sits in its own column beside all the text lines.
  const lines = 2 + ((note ?? hasTerm) ? 1 : 0) + (extra ? 1 : 0);

  return (
    <li className={`${styles.row} ${faded ? styles.faded : ""}`}>
      <div className={styles.details}>
        <Link
          href={`/members/${member.id}`}
          className={styles.avatarCell}
          style={{ gridRow: `1 / span ${lines}` }}
          tabIndex={-1}
          aria-hidden="true"
        >
          <Avatar src={member.photo_url} name={member.full_name} gender={member.gender} size={44} />
        </Link>
        <p className={styles.nameLine}>
          <Link href={`/members/${member.id}`} className={styles.name}>
            {member.full_name}
          </Link>
          {status ?? <Badge variant={membership.variant}>{membership.label}</Badge>}
        </p>

        <p className={styles.plan}>
          {hasTerm ? (
            <>
              <span className={styles.planName}>{member.plan_name}</span>
              {" · "}
              {formatDate(member.membership_start_date)} → {formatDate(member.membership_end_date)}
            </>
          ) : (
            "No membership on record"
          )}
        </p>

        {(note ?? hasTerm) && (
          <p className={`${styles.note} ${note ? "" : styles[membership.variant] ?? ""}`}>
            {note ?? remainingText(membership.daysRemaining)}
          </p>
        )}

        {extra && <p className={styles.extra}>{extra}</p>}
      </div>

      <div className={`${styles.actions} ${showRenew ? styles.withRenew : ""}`}>
        {showRenew && (
          <Link
            href={`/payments/new?member=${member.id}`}
            className={`${styles.action} ${styles.renew}`}
            aria-label={`Renew ${member.full_name}`}
          >
            <RupeeIcon size={16} />
            Renew Payment
          </Link>
        )}
        <a
          href={telHref(member.phone)}
          className={styles.action}
          aria-label={`Call ${member.full_name}`}
        >
          <PhoneIcon size={16} />
          Call
        </a>
        <a
          href={whatsAppHref(member.phone, whatsAppMessage(member, membership))}
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.action} ${styles.whatsapp}`}
          aria-label={`Send ${member.full_name} a WhatsApp message`}
        >
          <WhatsAppIcon size={16} />
          WhatsApp
        </a>
      </div>

      {menu && <div className={styles.menu}>{menu}</div>}
    </li>
  );
}

/** The list the rows sit in. */
export function MemberList({ children }) {
  return <ul className={styles.list}>{children}</ul>;
}
