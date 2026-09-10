import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { EyeIcon, EditIcon, TrashIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/utils/dates";
import { describeMembership } from "@/lib/utils/membershipStatus";
import { orDash, titleCase } from "@/lib/utils/format";
import tableStyles from "@/components/ui/Table.module.css";
import styles from "./MemberTable.module.css";

/**
 * One row of the members table.
 *
 * The status shown here is worked out from the membership end date every time
 * the row renders, so it is correct the moment the page loads and needs no
 * stored value to be kept up to date.
 */
export default function MemberRow({ member, onDelete }) {
  const membership = describeMembership(member.membership_end_date);

  return (
    <tr>
      <td>
        <Link href={`/members/${member.id}`} className={styles.name}>
          {member.full_name}
        </Link>
        <p className={styles.subtext}>{orDash(member.email)}</p>
      </td>
      <td className={tableStyles.muted}>{member.phone}</td>
      <td className={tableStyles.muted}>{titleCase(member.gender)}</td>
      <td>{orDash(member.plan_name)}</td>
      <td className={`${tableStyles.muted} ${tableStyles.numeric}`}>
        {formatDate(member.join_date)}
      </td>
      <td className={tableStyles.numeric}>
        {member.membership_end_date ? formatDate(member.membership_end_date) : "—"}
      </td>
      <td>
        <Badge variant={membership.variant}>{membership.label}</Badge>
      </td>
      <td className={tableStyles.actionsCell}>
        <span className={styles.actions}>
          <Link
            href={`/members/${member.id}`}
            className={styles.actionButton}
            title="View member"
            aria-label={`View ${member.full_name}`}
          >
            <EyeIcon size={15} />
          </Link>
          <Link
            href={`/members/${member.id}/edit`}
            className={styles.actionButton}
            title="Edit member"
            aria-label={`Edit ${member.full_name}`}
          >
            <EditIcon size={15} />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(member)}
            className={`${styles.actionButton} ${styles.deleteButton}`}
            title="Delete member"
            aria-label={`Delete ${member.full_name}`}
          >
            <TrashIcon size={15} />
          </button>
        </span>
      </td>
    </tr>
  );
}
