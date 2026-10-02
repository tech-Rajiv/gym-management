import Link from "next/link";
import StatCard from "@/components/dashboard/StatCard";
import RenewalList from "@/components/dashboard/RenewalList";
import Fab from "@/components/ui/Fab";
import {
  getDashboardStats,
  getExpiringMembers,
  getExpiredMembers,
} from "@/lib/db/dashboard";
import { requireAdmin } from "@/lib/auth";
import { today, formatDate } from "@/lib/utils/dates";
import { MembersIcon, ClockIcon, PlusIcon, InboxIcon } from "@/components/ui/icons";
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
 * The dashboard: a greeting, how many members there are, and the two lists
 * worth phoning today - memberships that have already run out (first, as the
 * most urgent), then ones about to.
 *
 * The queries run on the server, together, so the page waits for the slowest
 * one rather than each in turn. Members who have left are not counted.
 */
export default async function DashboardPage() {
  const admin = await requireAdmin();

  const [stats, expiringMembers, expiredMembers] = await Promise.all([
    getDashboardStats(),
    getExpiringMembers(),
    getExpiredMembers(),
  ]);

  return (
    <div>
      <section className={styles.welcome}>
        <div>
          <p className={styles.welcomeDate}>{formatDate(today())}</p>
          <h1 className={styles.welcomeTitle}>Hi {admin.name} 👋</h1>
          <p className={styles.welcomeText}>
            {stats.expiring_soon + stats.expired > 0
              ? `${stats.expiring_soon} expiring soon and ${stats.expired} expired - a good day for renewal calls.`
              : "Every membership is up to date. Nice work."}
          </p>
        </div>
        {/* On phones the floating button below does this job instead. */}
        <Link href="/members/new" className={`${styles.welcomeAction} desktop-only`}>
          <PlusIcon size={16} />
          Add Member
        </Link>
      </section>

      {/* Each card opens the members list already filtered to the same
          people, so the number and the list always agree. */}
      <div className={styles.stats}>
        <StatCard
          label="Total Members"
          value={stats.total_members}
          hint="Everyone still training here"
          icon={MembersIcon}
          tone="primary"
          href="/members"
        />
        <StatCard
          label="Expiring Soon"
          value={stats.expiring_soon}
          hint={`Ends within ${EXPIRING_SOON_DAYS} days`}
          icon={ClockIcon}
          tone="warning"
          href="/members?status=expiring"
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          hint="Membership has run out"
          icon={InboxIcon}
          tone="danger"
          href="/members?status=expired"
        />
      </div>

      <div className={styles.lists}>
        <RenewalList
          title="Expired"
          description="Most recently expired first"
          emptyTitle="No expired memberships."
          members={expiredMembers}
          viewAllHref="/members?status=expired"
          tone="danger"
          icon={InboxIcon}
        />
        <RenewalList
          title="Expiring Soon"
          description={`Ending within the next ${EXPIRING_SOON_DAYS} days`}
          emptyTitle="No memberships are expiring soon."
          members={expiringMembers}
          viewAllHref="/members?status=expiring"
          tone="warning"
          icon={ClockIcon}
        />
      </div>

      <Fab href="/members/new" label="Add Member" icon={PlusIcon} />
    </div>
  );
}
