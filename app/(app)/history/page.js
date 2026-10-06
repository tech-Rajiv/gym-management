import { Suspense } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import PeriodFilter from "@/components/ui/PeriodFilter";
import EmptyState from "@/components/ui/EmptyState";
import HistoryList from "@/components/history/HistoryList";
import { getAuditLogs, getAuditCount, AUDIT_PAGE_SIZE } from "@/lib/db/audit";
import { requireAdmin } from "@/lib/auth";
import { resolvePeriod, periodOptions } from "@/lib/utils/period";
import { today } from "@/lib/utils/dates";
import { HistoryIcon } from "@/components/ui/icons";
import styles from "./history.module.css";

export const metadata = { title: "History Logs" };

export const dynamic = "force-dynamic";

/**
 * History Logs - every change made through the application, newest first, and
 * who made it.
 *
 * Filtered by date like the payment history - All time, This month, Last
 * month or a custom range. The period and the page number live in the URL
 * (`?month=` or `?from=&to=`, and `?page=`), so PostgreSQL does the filtering
 * and a view can be bookmarked.
 */
export default async function HistoryPage({ searchParams }) {
  await requireAdmin();

  const { month, from, to, page: pageParam } = await searchParams;
  const period = resolvePeriod({ month, from, to });
  const page = Math.max(1, Number.parseInt(pageParam, 10) || 1);

  const [logs, total] = await Promise.all([
    getAuditLogs({ from: period.from, to: period.to, page }),
    getAuditCount({ from: period.from, to: period.to }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  /** The URL of another page of the same period. */
  const pageHref = (target) => {
    const params = new URLSearchParams();
    if (period.mode === "month") params.set("month", period.month);
    if (period.mode === "custom") {
      if (period.from) params.set("from", period.from);
      if (period.to) params.set("to", period.to);
    }
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `/history?${query}` : "/history";
  };

  return (
    <div>
      <PageHeader
        banner
        icon={<HistoryIcon size={18} />}
        eyebrow={`${total} ${total === 1 ? "entry" : "entries"} · ${period.label}`}
        title="History Logs"
        description="Every change, with who made it and when."
      />

      <Card flush tone="primary">
        {/* PeriodFilter reads the URL, so it needs a Suspense boundary. */}
        <Suspense fallback={null}>
          <div className={styles.filterBar}>
            <PeriodFilter id="history-period" options={periodOptions(today())} period={period} />
          </div>
        </Suspense>

        <p className={styles.summary}>
          {total} {total === 1 ? "entry" : "entries"}
          <span className={styles.summaryPeriod}>{period.label}</span>
        </p>

        {logs.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon size={20} />}
            title={period.mode === "all" ? "Nothing logged yet." : "Nothing logged in this period."}
            description={
              period.mode === "all"
                ? "Changes appear here as soon as they are made - adding a member, recording a payment, and so on."
                : "Try a different period, or All time."
            }
          />
        ) : (
          <HistoryList logs={logs} />
        )}

        {pageCount > 1 && (
          <nav className={styles.pager} aria-label="History pages">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className={styles.pagerLink}>
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className={styles.pagerInfo}>
              Page {page} of {pageCount}
            </span>
            {page < pageCount ? (
              <Link href={pageHref(page + 1)} className={styles.pagerLink}>
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </Card>
    </div>
  );
}
