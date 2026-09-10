import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { UserPlusIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils/dates";
import tableStyles from "@/components/ui/Table.module.css";
import styles from "./DashboardTable.module.css";

/** Members who joined during the current calendar month. */
export default function NewMembers({ members }) {
  if (members.length === 0) {
    return (
      <Card title="New Members This Month" flush>
        <EmptyState
          icon={<UserPlusIcon size={20} />}
          title="No new members yet this month."
          description="Members you add this month will be listed here."
          action={
            <Button href="/members/new" variant="primary" size="small">
              Add Member
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <Card
      title="New Members This Month"
      description={`${members.length} joined so far`}
      flush
    >
      <div className={tableStyles.wrapper}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Joined Date</th>
              <th>Plan</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>
                  <Link href={`/members/${member.id}`} className={styles.nameLink}>
                    {member.full_name}
                  </Link>
                  <p className={styles.subtext}>{member.phone}</p>
                </td>
                <td className={tableStyles.numeric}>{formatDate(member.join_date)}</td>
                <td>
                  <Badge variant="primary" dot={false}>
                    {member.plan_name}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
