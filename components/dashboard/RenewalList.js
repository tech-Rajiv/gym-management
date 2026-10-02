import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import {
  InboxIcon,
  EyeIcon,
  PhoneIcon,
  WhatsAppIcon,
  RefreshIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/utils/dates";
import { describeMembership } from "@/lib/utils/membershipStatus";
import { telHref, whatsAppHref } from "@/lib/utils/format";
import { APP_NAME } from "@/lib/config";
import styles from "./RenewalList.module.css";

const plural = (count) => `${count} day${count === 1 ? "" : "s"}`;

/** "3 days left", "Last day today" or "Expired 3 days ago". */
function remainingText(daysRemaining) {
  if (daysRemaining === 0) return "Last day today";
  return daysRemaining > 0
    ? `${plural(daysRemaining)} left`
    : `Expired ${plural(Math.abs(daysRemaining))} ago`;
}

/**
 * The WhatsApp message typed in for the admin, ready to send: a friendly
 * payment reminder with the member's name, plan and date.
 */
function reminderMessage(member, daysRemaining) {
  const firstName = member.full_name.split(" ")[0];
  const plan = member.plan_name ? `${member.plan_name} ` : "";
  const date = formatDate(member.membership_end_date);

  if (daysRemaining < 0) {
    return (
      `Hi ${firstName}, this is ${APP_NAME}. Your ${plan}membership expired on ${date}. ` +
      `Please renew it to continue your training - you can pay by cash or UPI at the desk. Thank you!`
    );
  }
  const when = daysRemaining === 0 ? "today" : `on ${date} (in ${plural(daysRemaining)})`;
  return (
    `Hi ${firstName}, this is a friendly reminder from ${APP_NAME}. Your ${plan}membership ` +
    `expires ${when}. Please renew to keep training without a break - you can pay by cash ` +
    `or UPI at the desk. Thank you!`
  );
}

/**
 * A dashboard call sheet: members whose membership has run out, or is about
 * to. Each row is the member's details and one set of actions:
 *
 *   Name [Expiring Soon]                   Renew  (call) (whatsapp)  View
 *   Monthly · Sep 06, 2026 → Oct 05, 2026
 *   3 days left
 *
 * Call opens the phone's dialler; WhatsApp opens a chat with a payment
 * reminder already written; Renew opens the payment form with the member
 * selected. On a phone the actions drop to their own row under the details.
 *
 * A Server Component - it receives rows already fetched by the page.
 *
 * @param {string} [viewAllHref] the members list filtered to the same people
 * @param {string} [tone]        the card's colour, matching its stat card
 */
export default function RenewalList({
  title,
  description,
  emptyTitle,
  members,
  viewAllHref,
  tone,
  icon,
}) {
  return (
    <Card
      title={title}
      description={description}
      tone={tone}
      icon={icon}
      action={
        members.length > 0 && viewAllHref ? (
          <Link href={viewAllHref} className={styles.viewAll}>
            View all
          </Link>
        ) : null
      }
      flush
    >
      {members.length === 0 ? (
        <EmptyState icon={<InboxIcon size={20} />} title={emptyTitle} />
      ) : (
        <ul className={styles.list}>
          {members.map((member) => {
            const membership = describeMembership(member.membership_end_date);
            return (
              <li key={member.id} className={styles.row}>
                <div className={styles.details}>
                  <p className={styles.nameLine}>
                    <Link href={`/members/${member.id}`} className={styles.name}>
                      {member.full_name}
                    </Link>
                    <Badge variant={membership.variant}>{membership.label}</Badge>
                  </p>
                  <p className={styles.plan}>
                    <span className={styles.planName}>{member.plan_name}</span>
                    {" · "}
                    {formatDate(member.membership_start_date)} →{" "}
                    {formatDate(member.membership_end_date)}
                  </p>
                  <p className={`${styles.remaining} ${styles[membership.variant] ?? ""}`}>
                    {remainingText(membership.daysRemaining)}
                  </p>
                </div>

                <div className={styles.actions}>
                  <Link
                    href={`/payments/new?member=${member.id}`}
                    className={styles.renew}
                    aria-label={`Renew ${member.full_name}`}
                  >
                    <RefreshIcon size={15} />
                    Renew
                  </Link>
                  <a
                    href={telHref(member.phone)}
                    className={styles.iconButton}
                    title={`Call ${member.phone}`}
                    aria-label={`Call ${member.full_name}`}
                  >
                    <PhoneIcon size={16} />
                  </a>
                  <a
                    href={whatsAppHref(
                      member.phone,
                      reminderMessage(member, membership.daysRemaining)
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.iconButton} ${styles.whatsapp}`}
                    title="Send a WhatsApp reminder"
                    aria-label={`Send ${member.full_name} a WhatsApp reminder`}
                  >
                    <WhatsAppIcon size={16} />
                  </a>
                  <Link
                    href={`/members/${member.id}`}
                    className={styles.view}
                    aria-label={`View ${member.full_name}`}
                  >
                    <EyeIcon size={15} />
                    View
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
