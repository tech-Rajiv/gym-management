import { Suspense } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import FilterTabs from "@/components/ui/FilterTabs";
import EmptyState from "@/components/ui/EmptyState";
import HistoryList from "@/components/history/HistoryList";
import {
  getAuditLogs,
  getAuditCounts,
  normalizeAuditFilter,
  AUDIT_FILTERS,
  AUDIT_PAGE_SIZE,
} from "@/lib/db/audit";
import { requireAdmin } from "@/lib/auth";
import { HistoryIcon } from "@/components/ui/icons";
import styles from "./history.module.css";

export const metadata = { title: "History Logs" };

export const dynamic = "force-dynamic";

/**
 * History Logs - every change made through the application, newest first, and
 * who made it.
 *
 * The entity filter and the page number live in the URL (`?type=`, `?page=`),
 * like the members list, so PostgreSQL does the filtering and a view can be
 * bookmarked.
 */
export default async function HistoryPage({ searchParams }) {
  await requireAdmin();

  const { type, page: pageParam } = await searchParams;
  const filter = normalizeAuditFilter(type);
  const page = Math.max(1, Number.parseInt(pageParam, 10) || 1);

  const [logs, counts] = await Promise.all([
    getAuditLogs({ entity: filter, page }),
    getAuditCounts(),
  ]);

  const total = counts[filter] ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));

  /** The URL of another page of the same filtered list. */
  const pageHref = (target) => {
    const params = new URLSearchParams();
    if (filter !== "all") params.set("type", filter);
    if (target > 1) params.set("page", String(target));
    const query = params.toString();
    return query ? `/history?${query}` : "/history";
  };

  return (
    <div>
      <PageHeader
        title="History Logs"
        description="Every change made to members and payments, with who made it and when."
      />

      <Card flush tone="primary">
        {/* FilterTabs reads the URL, so it needs a Suspense boundary. */}
        <Suspense fallback={null}>
          <div className={styles.filterBar}>
            <FilterTabs
              param="type"
              active={filter}
              defaultValue="all"
              label="Filter history by type"
              options={AUDIT_FILTERS.map((option) => ({
                ...option,
                count: counts[option.value] ?? 0,
              }))}
            />
          </div>
        </Suspense>

        {logs.length === 0 ? (
          <EmptyState
            icon={<HistoryIcon size={20} />}
            title="Nothing logged yet."
            description="Changes appear here as soon as they are made - adding a member, recording a payment, and so on."
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
