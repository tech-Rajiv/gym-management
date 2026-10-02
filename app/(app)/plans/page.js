import PlansManager from "@/components/plans/PlansManager";
import { getPlansWithUsage } from "@/lib/db/plans";
import { requireAdmin } from "@/lib/auth";

export const metadata = { title: "Plans" };

export const dynamic = "force-dynamic";

/**
 * Membership Plans - the plans the gym sells, with their length and price.
 *
 * These are the plans offered when adding a member and when recording a
 * payment, and a new term is always charged at its plan's price. Editing a
 * price changes it from the next payment on; terms already sold keep theirs.
 */
export default async function PlansPage() {
  await requireAdmin();
  const plans = await getPlansWithUsage();

  return <PlansManager plans={plans} />;
}
