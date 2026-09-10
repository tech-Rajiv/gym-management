import PageHeader from "@/components/ui/PageHeader";
import PaymentForm from "@/components/payments/PaymentForm";
import EmptyState from "@/components/ui/EmptyState";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { getMembers } from "@/lib/db/members";
import { getMembershipPlans } from "@/lib/db/plans";
import { today } from "@/lib/utils/dates";
import { recordPaymentAction } from "@/app/payments/actions";
import { MembersIcon } from "@/components/ui/icons";

export const metadata = { title: "Record Payment" };

export const dynamic = "force-dynamic";

/**
 * Record Payment.
 *
 * A Server Component that gathers what the form needs and hands it over. The
 * member list carries each member's current term, which is what lets the form
 * show how long they are covered for and work out where their next term should
 * start - without another round trip when a member is chosen.
 *
 * `?member=` preselects someone, so the button on a member's own page opens
 * the form ready to go.
 */
export default async function NewPaymentPage({ searchParams }) {
  const { member: memberParam } = await searchParams;

  const [members, plans] = await Promise.all([
    getMembers(),
    getMembershipPlans(),
  ]);

  // A payment has to belong to somebody, so there is nothing useful to show
  // until at least one member exists.
  if (members.length === 0) {
    return (
      <div>
        <PageHeader title="Record Payment" />
        <Card flush>
          <EmptyState
            icon={<MembersIcon size={20} />}
            title="No members yet."
            description="Payments are recorded against a member, so add someone first."
            action={
              <Button href="/members/new" variant="primary" size="small">
                Add Member
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  const preselectedMemberId = Number(memberParam);

  return (
    <div>
      <PageHeader
        title="Record Payment"
        description="Enter a payment you have already received. Everything filled in automatically can be changed."
      />
      <PaymentForm
        action={recordPaymentAction}
        members={members}
        plans={plans}
        today={today()}
        preselectedMemberId={
          Number.isInteger(preselectedMemberId) && preselectedMemberId > 0
            ? preselectedMemberId
            : undefined
        }
      />
    </div>
  );
}
