"use client";

import { useState } from "react";
import RowMenu from "@/components/ui/RowMenu";
import MemberStatusDialog from "./MemberStatusDialog";
import { EyeIcon, EditIcon, UserMinusIcon, RestoreIcon } from "@/components/ui/icons";

/**
 * The "⋯" menu for a member row: View member, Edit member, and Mark as left
 * (or Restore, for someone who has left) - with its confirmation dialog.
 *
 * Owning the dialog itself is what lets any list use it, including the
 * dashboard's Server Component lists, so every member menu offers the same
 * options. After a change the page refreshes from the server.
 *
 * @param {object} member needs id, first_name, last_name, full_name and
 *                        member_status
 * @param {boolean} [showView] leave out "View member" on the member's own page
 */
export default function MemberRowMenu({ member, showView = true }) {
  const [dialog, setDialog] = useState(null);
  const isLeft = member.member_status === "left";

  return (
    <>
      <RowMenu
        label={`More for ${member.full_name}`}
        items={[
          ...(showView
            ? [{ label: "View member", icon: <EyeIcon size={16} />, href: `/members/${member.id}` }]
            : []),
          { label: "Edit member", icon: <EditIcon size={16} />, href: `/members/${member.id}/edit` },
          isLeft
            ? {
                label: "Restore member",
                icon: <RestoreIcon size={16} />,
                onClick: () => setDialog("restore"),
              }
            : {
                label: "Mark as left",
                icon: <UserMinusIcon size={16} />,
                onClick: () => setDialog("left"),
                danger: true,
              },
        ]}
      />

      {dialog && (
        <MemberStatusDialog
          member={member}
          mode={dialog}
          open
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
