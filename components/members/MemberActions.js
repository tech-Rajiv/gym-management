"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import DeleteMemberDialog from "./DeleteMemberDialog";
import { EditIcon, TrashIcon } from "@/components/ui/icons";

/**
 * Edit and Delete buttons for the member detail page.
 *
 * A small Client Component so the page around it can stay a Server Component -
 * only the part that needs to open a dialog runs in the browser.
 *
 * Deleting from here sends the user back to the list, since the record they
 * were looking at no longer exists.
 */
export default function MemberActions({ member }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Button href={`/members/${member.id}/edit`} variant="secondary">
        <EditIcon size={15} />
        Edit
      </Button>
      <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
        <TrashIcon size={15} />
        Delete
      </Button>

      <DeleteMemberDialog
        member={member}
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onDeleted={() => router.push("/members")}
      />
    </>
  );
}
