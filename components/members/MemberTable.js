"use client";

import { useState } from "react";
import MemberRow, { MemberRowCard } from "./MemberRow";
import { MemberCardList } from "./MemberCard";
import MemberStatusDialog from "./MemberStatusDialog";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { MembersIcon, SearchIcon, InboxIcon } from "@/components/ui/icons";
import { MEMBER_FILTERS, DEFAULT_MEMBER_FILTER } from "@/lib/utils/membershipStatus";
import tableStyles from "@/components/ui/Table.module.css";
import styles from "./MemberTable.module.css";

/**
 * The members list.
 *
 * A Client Component for one reason: it remembers which member the "mark as
 * left" or "restore" dialog is asking about. The rows themselves are plain presentational
 * components, and the data was fetched on the server by the page above.
 *
 * An empty list has three different meanings, and each needs its own advice:
 * nothing matched the search, nothing matched the filter, or there are no
 * members at all. Only the last one is worth offering an Add button for.
 *
 * @param {boolean} isSearching whether a search term is applied
 * @param {string}  filter      the status filter currently applied
 */
export default function MemberTable({
  members,
  isSearching = false,
  filter = DEFAULT_MEMBER_FILTER,
}) {
  // { member, mode: 'left' | 'restore' } while a dialog is open.
  const [statusChange, setStatusChange] = useState(null);

  if (members.length === 0) {
    if (isSearching) {
      return (
        <EmptyState
          icon={<SearchIcon size={20} />}
          title="No members found."
          description="No members match your search. Try a different name, phone number or email."
        />
      );
    }

    if (filter !== DEFAULT_MEMBER_FILTER) {
      const label = MEMBER_FILTERS.find((option) => option.value === filter)?.label;
      return (
        <EmptyState
          icon={<InboxIcon size={20} />}
          title={`No ${label?.toLowerCase()} members.`}
          description="Nobody falls into this group right now. Try a different filter."
        />
      );
    }

    return (
      <EmptyState
        icon={<MembersIcon size={20} />}
        title="No members found."
        description="Add your first member to get started."
        action={
          <Button href="/members/new" variant="primary" size="small">
            Add Member
          </Button>
        }
      />
    );
  }

  return (
    <>
      {/* The table on tablets and desktops; cards on phones. */}
      <div className={`${tableStyles.wrapper} ${tableStyles.tableOnly}`}>
        <table className={`${tableStyles.table} ${styles.wide}`}>
          <thead>
            <tr>
              <th>Member</th>
              <th className={styles.joinColumn}>Join Date</th>
              <th>Expiry / Plan</th>
              <th>Status</th>
              <th>Last Payment</th>
              <th className={tableStyles.actionsHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                onChangeStatus={(target, mode) => setStatusChange({ member: target, mode })}
              />
            ))}
          </tbody>
        </table>
      </div>

      <MemberCardList>
        {members.map((member) => (
          <MemberRowCard
            key={member.id}
            member={member}
            onChangeStatus={(target, mode) => setStatusChange({ member: target, mode })}
          />
        ))}
      </MemberCardList>

      {/* Rendered only while a member is selected, so the dialog always opens
          with fresh state and the right name. */}
      {statusChange && (
        <MemberStatusDialog
          member={statusChange.member}
          mode={statusChange.mode}
          open
          onClose={() => setStatusChange(null)}
        />
      )}
    </>
  );
}
