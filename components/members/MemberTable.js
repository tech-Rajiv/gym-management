"use client";

import { useState } from "react";
import MemberRow from "./MemberRow";
import DeleteMemberDialog from "./DeleteMemberDialog";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { MembersIcon, SearchIcon } from "@/components/ui/icons";
import tableStyles from "@/components/ui/Table.module.css";
import styles from "./MemberTable.module.css";

/**
 * The members list.
 *
 * A Client Component for one reason: it remembers which member the delete
 * dialog is asking about. The rows themselves are plain presentational
 * components, and the data was fetched on the server by the page above.
 *
 * @param {boolean} isSearching changes the empty state - "no results for this
 *                              search" is a different situation from "no
 *                              members yet", and they need different advice
 */
export default function MemberTable({ members, isSearching = false }) {
  const [memberToDelete, setMemberToDelete] = useState(null);

  if (members.length === 0) {
    return isSearching ? (
      <EmptyState
        icon={<SearchIcon size={20} />}
        title="No members found."
        description="No members match your search. Try a different name, phone number or email."
      />
    ) : (
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
      <div className={tableStyles.wrapper}>
        <table className={`${tableStyles.table} ${styles.wide}`}>
          <thead>
            <tr>
              <th>Member</th>
              <th>Phone</th>
              <th>Gender</th>
              <th>Plan</th>
              <th>Join Date</th>
              <th>Expiry Date</th>
              <th>Status</th>
              <th className={tableStyles.actionsHeader}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <MemberRow key={member.id} member={member} onDelete={setMemberToDelete} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Rendered only while a member is selected, so the dialog always opens
          with fresh state and the right name. */}
      {memberToDelete && (
        <DeleteMemberDialog
          member={memberToDelete}
          open={Boolean(memberToDelete)}
          onClose={() => setMemberToDelete(null)}
        />
      )}
    </>
  );
}
