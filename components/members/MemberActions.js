"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import MemberStatusDialog from "./MemberStatusDialog";
import { EditIcon, UserMinusIcon, RestoreIcon, CardIcon } from "@/components/ui/icons";
import styles from "./MemberActions.module.css";

/**
 * The buttons at the top of the member detail page.
 *
 * A small Client Component so the page around it can stay a Server Component -
 * only the part that needs to open a dialog runs in the browser. After marking
 * a member left (or restoring them) the page simply refreshes in place, since
 * the record is still there.
 *
 * On a phone the buttons form a tidy block: Add Payment across the full width,
 * with Edit and Mark as left sharing the row beneath it.
 */
export default function MemberActions({ member }) {
  const [dialog, setDialog] = useState(null);
  const isLeft = member.member_status === "left";

  return (
    <div className={`${styles.actions} ${isLeft ? styles.twoUp : ""}`}>
      {!isLeft && (
        <Button href={`/payments/new?member=${member.id}`} variant="primary">
          <CardIcon size={15} />
          Add Payment
        </Button>
      )}
      <Button href={`/members/${member.id}/edit`} variant="secondary">
        <EditIcon size={15} />
        Edit
      </Button>
      {isLeft ? (
        <Button variant="secondary" onClick={() => setDialog("restore")}>
          <RestoreIcon size={15} />
          Restore
        </Button>
      ) : (
        <Button variant="secondary" className={styles.leave} onClick={() => setDialog("left")}>
          <UserMinusIcon size={15} />
          Mark as left
        </Button>
      )}

      {dialog && (
        <MemberStatusDialog
          member={member}
          mode={dialog}
          open
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
