import Link from "next/link";
import StatCard from "@/components/dashboard/StatCard";
import RenewalList from "@/components/dashboard/RenewalList";
import EmailReportButton from "@/components/dashboard/EmailReportButton";
import { REPORT_EMAIL_TO } from "@/lib/email";
import {
  getDashboardStats,
  getExpiringMembers,
  getExpiredMembers,
  getNewMembersThisMonth,
} from "@/lib/db/dashboard";
import { requireAdmin } from "@/lib/auth";
import { today, formatDate } from "@/lib/utils/dates";
import {
  MembersIcon,
  ClockIcon,
  PlusIcon,
  CalendarXIcon,
  UserPlusIcon,
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
 * The dashboard: a greeting, how many members there are, and the two lists
 * worth phoning today - memberships that have already run out (first, as the
 * most urgent), then ones about to.
 *
 * The queries run on the server, together, so the page waits for the slowest
 * one rather than each in turn. Members who have left are not counted.
 */
export default async function DashboardPage() {
  const admin = await requireAdmin();

  // Each list fetches only its first few members; the stat counts say how
  // many there are in all, for the "See N more" buttons.
  const [stats, expiringMembers, expiredMembers, newMembers] = await Promise.all([
    getDashboardStats(),
    getExpiringMembers(),
    getExpiredMembers(),
    getNewMembersThisMonth(),
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
        <div className={styles.welcomeActions}>
          {/* Sends the morning report now, to preview it. */}
          <EmailReportButton to={REPORT_EMAIL_TO} />
          <Link href="/members/new" className={styles.welcomeAction}>
            <PlusIcon size={16} />
            Add Member
          </Link>
        </div>
      </section>

      {/* Each card opens the members list already filtered to the same
          people, so the number and the list always agree. */}
      <div className={styles.stats}>
        <StatCard
          label="Total Members"
          value={stats.total_members}
          hint="Still training here"
          icon={MembersIcon}
          tone="primary"
          href="/members"
          pdf={{ list: "members", params: { status: "all" } }}
        />
        <StatCard
          label="Expiring Soon"
          value={stats.expiring_soon}
          hint={`Ends within ${EXPIRING_SOON_DAYS} days`}
          icon={ClockIcon}
          tone="warning"
          href="/members?status=expiring"
          pdf={{ list: "members", params: { status: "expiring" } }}
        />
        <StatCard
          label="Expired"
          value={stats.expired}
          hint="Membership has run out"
          icon={CalendarXIcon}
          tone="danger"
          href="/members?status=expired"
          pdf={{ list: "members", params: { status: "expired" } }}
        />
        <StatCard
          label="New This Month"
          value={stats.new_this_month}
          hint="Joined this month"
          icon={UserPlusIcon}
          tone="success"
          href="/members?status=new"
          pdf={{ list: "members", params: { status: "new" } }}
        />
      </div>

      <div className={styles.lists}>
        <RenewalList
          title="Expired"
          pdfStatus="expired"
          description="Most recently expired first"
          emptyTitle="No expired memberships."
          members={expiredMembers}
          total={stats.expired}
          moreHref="/members?status=expired"
          tone="danger"
          icon={CalendarXIcon}
        />
        <RenewalList
          title="Expiring Soon"
          pdfStatus="expiring"
          description={`Ending within the next ${EXPIRING_SOON_DAYS} days`}
          emptyTitle="No memberships are expiring soon."
          members={expiringMembers}
          total={stats.expiring_soon}
          moreHref="/members?status=expiring"
          tone="warning"
          icon={ClockIcon}
        />
        <RenewalList
          title="New This Month"
          pdfStatus="new"
          description="Joined this calendar month, newest first"
          emptyTitle="Nobody has joined yet this month."
          members={newMembers}
          total={stats.new_this_month}
          moreHref="/members?status=new"
          showJoined
          tone="success"
          icon={UserPlusIcon}
        />
      </div>
    </div>
  );
}
