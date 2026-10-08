import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import PaySubscription from "@/components/subscription/PaySubscription";
import { requireAdmin } from "@/lib/auth";
import { getGymSubscription } from "@/lib/db/gyms";
import { today } from "@/lib/utils/dates";
import { describeSubscription, upcomingCover } from "@/lib/utils/subscription";

export const metadata = { title: "Pay subscription" };
export const dynamic = "force-dynamic";

/**
 * The only gym page open when cover has ended. A current subscription can
 * still open it from the badge to renew early.
 */
export default async function PaySubscriptionPage() {
  const admin = await requireAdmin();
  const referenceDate = today();
  const subscription = describeSubscription(await getGymSubscription(admin.gymId), referenceDate);
  const cover = upcomingCover(subscription.paidUntil, referenceDate);

  return (
    <div>
      <PageHeader title="Pay subscription" description={admin.gymName || "This gym"} />
      <Card>
        <PaySubscription
          gymName={admin.gymName}
          subscription={subscription}
          coverStarts={cover.starts}
          coverEnds={cover.ends}
        />
      </Card>
    </div>
  );
}
