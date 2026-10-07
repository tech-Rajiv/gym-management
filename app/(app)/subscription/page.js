import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { EXPIRING_SOON_DAYS } from "@/lib/config";
import { getGymSubscription } from "@/lib/db/gyms";
import { formatDate, today } from "@/lib/utils/dates";
import { describeSubscription } from "@/lib/utils/subscription";
import styles from "./subscription.module.css";

export const metadata = { title: "Subscription" };
export const dynamic = "force-dynamic";

const BADGE = {
  paid: "success",
  expiring: "warning",
  expired: "danger",
  unpaid: "warning",
};

/**
 * The software subscription for the signed-in gym.
 *
 * The end date is what tells the owner it is about to run out. Member fees
 * recorded under Payments are not shown here.
 */
export default async function SubscriptionPage() {
  const admin = await requireAdmin();
  const subscription = describeSubscription(await getGymSubscription(admin.gymId), today());

  return (
    <div>
      <PageHeader
        title="Gym subscription"
        description={`Whether ${admin.gymName ?? "this gym"} has paid for this software, and the last day that payment covers.`}
      />

      <Card>
        <div className={styles.status}>
          <Badge variant={BADGE[subscription.state]}>{subscription.label}</Badge>
          <p className={styles.headline}>{subscription.headline}</p>
          <p className={styles.detail}>{subscription.detail}</p>
        </div>

        <dl className={styles.facts}>
          <div>
            <dt>Last paid day</dt>
            <dd>{subscription.paidUntil ? formatDate(subscription.paidUntil) : "Not set"}</dd>
          </div>
          <div>
            <dt>Days left</dt>
            <dd>
              {subscription.daysLeft == null
                ? "—"
                : subscription.daysLeft < 0
                  ? "Ended"
                  : subscription.daysLeft}
            </dd>
          </div>
          <div>
            <dt>Warning starts</dt>
            <dd>{EXPIRING_SOON_DAYS} days before the last paid day</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
