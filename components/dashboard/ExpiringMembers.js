import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { InboxIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils/dates";
import { describeMembership } from "@/lib/utils/membershipStatus";
import { EXPIRING_SOON_DAYS } from "@/lib/config";
import tableStyles from "@/components/ui/Table.module.css";
import styles from "./DashboardTable.module.css";

/**
 * Memberships running out inside the expiry window.
 *
 * A Server Component - it receives rows that were already fetched by the page
 * and only decides how to show them. The Active / Expiring / Expired wording
 * comes from describeMembership, the same helper the members table uses.
 */
export default function ExpiringMembers({ members }) {
  if (members.length === 0) {
    return (
      <Card
        title="Memberships Expiring This Week"
        description={`Ending within the next ${EXPIRING_SOON_DAYS} days`}
        flush
      >
        <EmptyState
          icon={<InboxIcon size={20} />}
          title="No memberships are expiring this week."
          description="Renewals due in the next few days will appear here."
        />
      </Card>
    );
  }

  return (
    <Card
      title="Memberships Expiring This Week"
      description={`${members.length} ending within the next ${EXPIRING_SOON_DAYS} days`}
      flush
    >
      <div className={tableStyles.wrapper}>
        <table className={`${tableStyles.table} ${tableStyles.compact}`}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Plan</th>
              <th>Expiry Date</th>
              <th>Status</th>
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
                  <td data-label="Plan" className={tableStyles.muted}>{member.plan_name}</td>
                  <td data-label="Expiry Date" className={tableStyles.numeric}>
                    {formatDate(member.membership_end_date)}
                    <p className={styles.subtext}>
                      {membership.daysRemaining === 0
                        ? "Expires today"
                        : `in ${membership.daysRemaining} day${
                            membership.daysRemaining === 1 ? "" : "s"
                          }`}
                    </p>
                  </td>
                  <td data-label="Status">
                    <Badge variant={membership.variant}>{membership.label}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
