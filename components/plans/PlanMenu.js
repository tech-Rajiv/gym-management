"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RowMenu from "@/components/ui/RowMenu";
import { PlanFormDialog, DeletePlanDialog } from "./PlanDialogs";
import { EditIcon, TrashIcon } from "@/components/ui/icons";

/**
 * The "⋯" menu for a plan - Edit and Delete, with their dialogs - used in the
 * corner of each plan card and on the plan's own page.
 *
 * Editing refreshes the page in place; deleting takes the plan off sale and
 * lands on the Plans list.
 *
 * @param {object} plan needs id, name, duration_days, price, includes_cardio,
 *                      description and member_count
 */
export default function PlanMenu({ plan }) {
  const router = useRouter();
  const [dialog, setDialog] = useState(null);

  return (
    <>
      <RowMenu
        label={`More for ${plan.name}`}
        items={[
          { label: "Edit plan", icon: <EditIcon size={16} />, onClick: () => setDialog("edit") },
          {
            label: "Delete plan",
            icon: <TrashIcon size={16} />,
            onClick: () => setDialog("delete"),
            danger: true,
          },
        ]}
      />

      {dialog === "edit" && (
        <PlanFormDialog
          plan={plan}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            router.refresh();
          }}
        />
      )}
      {dialog === "delete" && (
        <DeletePlanDialog
          plan={plan}
          onClose={() => setDialog(null)}
          onDeleted={() => {
            setDialog(null);
            router.push("/plans");
            router.refresh();
          }}
        />
      )}
    </>
  );
}
