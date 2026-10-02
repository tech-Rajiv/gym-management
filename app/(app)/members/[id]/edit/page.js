import { notFound } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import MemberForm from "@/components/members/MemberForm";
import { getMemberById } from "@/lib/db/members";
import { getMembershipPlans, getMembershipPlanById } from "@/lib/db/plans";
import { today } from "@/lib/utils/dates";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const member = await getMemberById(id);
  return { title: member ? `Edit ${member.full_name}` : "Edit Member" };
}

/**
 * Edit Member.
 *
 * The same MemberForm as the Add page, given the existing member. Handing it
 * a member is what makes the form PATCH /api/members/:id instead of creating
 * someone new.
 */
export default async function EditMemberPage({ params }) {
  await requireAdmin();
  const { id } = await params;

  // Both are needed before anything can render, so they run together.
  const [member, plans] = await Promise.all([getMemberById(id), getMembershipPlans()]);

  if (!member) notFound();

  // A member whose plan has since been deleted (taken off sale) must still see
  // it selected - otherwise the form could not be saved without changing it.
  const currentPlanOnSale = plans.some((plan) => plan.id === member.membership_plan_id);
  const retiredPlan =
    member.membership_plan_id && !currentPlanOnSale
      ? await getMembershipPlanById(member.membership_plan_id)
      : null;
  const planOptions = retiredPlan
    ? [...plans, { ...retiredPlan, name: `${retiredPlan.name} (no longer sold)` }]
    : plans;

  return (
    <div>
      <PageHeader
        title={`Edit ${member.full_name}`}
        description="Update this member's details or correct their current membership."
        backHref={`/members/${member.id}`}
        backLabel="Back to member"
      />

      <MemberForm
        member={member}
        plans={planOptions}
        today={today()}
        submitLabel="Save Changes"
      />
    </div>
  );
}
