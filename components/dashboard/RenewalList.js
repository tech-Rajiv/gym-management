import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { InboxIcon, CardIcon, EyeIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils/dates";
import { describeMembership } from "@/lib/utils/membershipStatus";
import tableStyles from "@/components/ui/Table.module.css";
import styles from "./DashboardTable.module.css";

const plural = (count) => `${count} day${count === 1 ? "" : "s"}`;

/** "Expires today", "in 3 days" or "3 days ago". */
function whenText(daysRemaining) {
  if (daysRemaining === 0) return "Expires today";
  return daysRemaining > 0
    ? `in ${plural(daysRemaining)}`
    : `${plural(Math.abs(daysRemaining))} ago`;
}

/**
 * A dashboard call sheet: members whose membership is about to run out, or
 * already has. Each row offers the payment form with the member selected, so a
 * renewal taken at the desk is two clicks away.
 *
 * A Server Component - it receives rows already fetched by the page. The
 * status wording comes from describeMembership, as in the members table.
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
        <div className={tableStyles.wrapper}>
          <table className={`${tableStyles.table} ${tableStyles.compact}`}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Plan</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th className={tableStyles.actionsHeader}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const membership = describeMembership(member.membership_end_date);
                return (
                  <tr key={member.id}>
                    <td>
                      <Link href={`/members/${member.id}`} className={styles.nameLink}>
                        {member.full_name}
                      </Link>
                      <p className={styles.subtext}>{member.phone}</p>
                    </td>
                    <td data-label="Plan" className={tableStyles.muted}>
                      {member.plan_name}
                    </td>
                    <td data-label="Expiry Date" className={tableStyles.numeric}>
                      {formatDate(member.membership_end_date)}
                      <p className={styles.subtext}>{whenText(membership.daysRemaining)}</p>
                    </td>
                    <td data-label="Status">
                      <Badge variant={membership.variant}>{membership.label}</Badge>
                    </td>
                    <td className={tableStyles.actionsCell}>
                      <span className={tableStyles.actions}>
                        <Link
                          href={`/payments/new?member=${member.id}`}
                          className={tableStyles.payAction}
                          aria-label={`Add payment for ${member.full_name}`}
                        >
                          <CardIcon size={15} />
                          Add payment
                        </Link>
                        <Link
                          href={`/members/${member.id}`}
                          className={tableStyles.actionButton}
                          title="View member"
                          aria-label={`View ${member.full_name}`}
                        >
                          <EyeIcon size={15} />
                        </Link>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
