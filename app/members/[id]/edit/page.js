import { notFound } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import MemberForm from "@/components/members/MemberForm";
import { getMemberById } from "@/lib/db/members";
import { getMembershipPlans } from "@/lib/db/plans";
import { updateMemberAction } from "@/app/members/actions";
import { today } from "@/lib/utils/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const member = await getMemberById(id);
  return { title: member ? `Edit ${member.full_name}` : "Edit Member" };
}

/**
 * Edit Member.
 *
 * The same MemberForm as the Add page, given the existing member and an action
 * bound to their id. `bind` creates a new Server Action with the id already
 * supplied, which means the id travels with the action rather than sitting in
 * a hidden form field the browser could change.
 */
export default async function EditMemberPage({ params }) {
  const { id } = await params;

  // Both are needed before anything can render, so they run together.
  const [member, plans] = await Promise.all([getMemberById(id), getMembershipPlans()]);

  if (!member) notFound();

  const updateAction = updateMemberAction.bind(null, member.id);

  return (
    <div>
      <PageHeader
        title={`Edit ${member.full_name}`}
        description="Update this member's details or correct their current membership."
        backHref={`/members/${member.id}`}
        backLabel="Back to member"
      />

      <MemberForm
        action={updateAction}
        member={member}
        plans={plans}
        today={today()}
        submitLabel="Save Changes"
      />
    </div>
  );
}
