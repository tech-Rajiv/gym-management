import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatCard from "@/components/dashboard/StatCard";
import ExpiringMembers from "@/components/dashboard/ExpiringMembers";
import NewMembers from "@/components/dashboard/NewMembers";
import {
  getDashboardStats,
  getExpiringMembers,
  getNewMembersThisMonth,
} from "@/lib/db/dashboard";
import { getRevenueThisMonth } from "@/lib/db/payments";
import { today, startOfMonth } from "@/lib/utils/dates";
import { formatCurrency } from "@/lib/utils/format";
import {
  MembersIcon,
  UsersCheckIcon,
  UserPlusIcon,
  ClockIcon,
  PlusIcon,
  CardIcon,
} from "@/components/ui/icons";
import { EXPIRING_SOON_DAYS } from "@/lib/config";
import styles from "./dashboard.module.css";

export const metadata = { title: "Dashboard" };

/**
 * Membership data changes whenever the owner adds or edits a member, and the
 * numbers depend on today's date, so this page is rendered per request rather
 * than cached at build time.
 */
export const dynamic = "force-dynamic";

/**
 * The dashboard.
 *
 * A Server Component: the three queries run on the server and only the
 * finished HTML reaches the browser. They are started together with
 * Promise.all so the page waits for the slowest one, not for all three in turn.
 *
 * Every figure comes from PostgreSQL - there are no fixed numbers here.
 */
export default async function DashboardPage() {
  const referenceDate = today();

  const [stats, expiringMembers, newMembers, revenueThisMonth] =
    await Promise.all([
      getDashboardStats(),
      getExpiringMembers(),
      getNewMembersThisMonth(),
      getRevenueThisMonth({
        monthStart: startOfMonth(referenceDate),
        referenceDate,
      }),
    ]);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="An overview of your gym's membership activity."
        actions={
          <>
            <Button href="/payments/new" variant="secondary">
              <CardIcon size={16} />
              Record Payment
            </Button>
            <Button href="/members/new" variant="primary">
              <PlusIcon size={16} />
              Add Member
            </Button>
          </>
        }
      />

      {/* The three cards that match a members filter link straight to it.
          New This Month has no equivalent filter, so it stays a plain figure
          rather than linking somewhere that would show a different number. */}
      <div className={styles.stats}>
        <StatCard
          label="Total Members"
          value={stats.total_members}
          hint="All time"
          icon={MembersIcon}
          href="/members"
        />
        <StatCard
          label="Active Members"
          value={stats.active_members}
          hint="Membership still running"
          icon={UsersCheckIcon}
          href="/members?status=active"
        />
        <StatCard
          label="New This Month"
          value={stats.new_this_month}
          hint="Joined this calendar month"
          icon={UserPlusIcon}
        />
        <StatCard
          label="Collected This Month"
          value={formatCurrency(revenueThisMonth)}
          hint="Payments recorded this month"
          icon={CardIcon}
          href="/payments"
        />
        <StatCard
          label="Expiring This Week"
          value={stats.expiring_this_week}
          hint={`Within ${EXPIRING_SOON_DAYS} days`}
          icon={ClockIcon}
          accent={stats.expiring_this_week > 0}
          href="/members?status=expiring"
        />
      </div>

      <div className={styles.sections}>
        <ExpiringMembers members={expiringMembers} />
        <NewMembers members={newMembers} />
      </div>
    </div>
  );
}
