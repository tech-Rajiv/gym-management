import PageHeader from "@/components/ui/PageHeader";
import MemberForm from "@/components/members/MemberForm";
import { getMembershipPlans } from "@/lib/db/plans";
import { createMemberAction } from "@/app/members/actions";
import { today } from "@/lib/utils/dates";

export const metadata = { title: "Add Member" };

/**
 * Rendered per request, not at build time. The form's default join date is
 * today's date and the plan list must reflect plans added since the last
 * deploy - both would otherwise be frozen at whatever they were when the
 * application was built.
 */
export const dynamic = "force-dynamic";

/**
 * Add Member.
 *
 * A Server Component that loads the plans and hands them, along with the gym's
 * current date, to the form. The form is a Client Component because it needs
 * to react as fields change; the data it needs is fetched here so it does not
 * have to fetch anything itself.
 */
export default async function NewMemberPage() {
  const plans = await getMembershipPlans();

  return (
    <div>
      <PageHeader
        title="Add Member"
        description="Create a member record and their first membership."
        backHref="/members"
        backLabel="Back to members"
      />

      <MemberForm
        action={createMemberAction}
        plans={plans}
        today={today()}
        submitLabel="Add Member"
      />
    </div>
  );
}
