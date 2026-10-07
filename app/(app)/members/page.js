import { Suspense } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import MemberTable from "@/components/members/MemberTable";
import SearchInput from "@/components/ui/SearchInput";
import FilterTabs from "@/components/ui/FilterTabs";
import { getMembers, getMemberStatusCounts } from "@/lib/db/members";
import {
  normalizeMemberFilter,
  MEMBER_FILTERS,
  DEFAULT_MEMBER_FILTER,
} from "@/lib/utils/membershipStatus";
import {
  MembersIcon,
  PlusIcon,
  UserPlusIcon,
  ClockIcon,
  CalendarXIcon,
  UserMinusIcon,
} from "@/components/ui/icons";
import DownloadPdfButton from "@/components/ui/DownloadPdfButton";
import { requireAdmin } from "@/lib/auth";
import styles from "./members.module.css";

export const metadata = { title: "Members" };

/** An icon per filter tab, the same ones the dashboard uses for each group. */
const FILTER_ICONS = {
  all: <MembersIcon size={15} />,
  new: <UserPlusIcon size={15} />,
  expiring: <ClockIcon size={15} />,
  expired: <CalendarXIcon size={15} />,
  left: <UserMinusIcon size={15} />,
};

/** Member data changes as soon as the owner edits it, so never serve a cached copy. */
export const dynamic = "force-dynamic";

/**
 * Manage Members.
 *
 * The search term and the status filter are both read from the URL rather than
 * component state. The page re-runs on the server whenever they change and
 * PostgreSQL does the filtering, which means the browser never holds the full
 * member list, a filtered view can be bookmarked or shared, and the dashboard
 * can link straight to one.
 *
 * `searchParams` is a promise in this version of Next.js and has to be awaited.
 */
export default async function MembersPage({ searchParams }) {
  const admin = await requireAdmin();
  const { q: search = "", status } = await searchParams;
  const filter = normalizeMemberFilter(status);

  const [members, counts] = await Promise.all([
    getMembers({ gymId: admin.gymId, search, status: filter }),
    getMemberStatusCounts({ gymId: admin.gymId, search }),
  ]);

  const filterLabel = MEMBER_FILTERS.find((option) => option.value === filter)?.label ?? "All";

  return (
    <div>
      <PageHeader
        banner
        icon={<MembersIcon size={18} />}
        eyebrow={
          search
            ? `${counts.all ?? 0} matching "${search}"`
            : `${counts.all ?? 0} ${counts.all === 1 ? "member" : "members"} training`
        }
        title="Manage Members"
        description="Everyone training at your gym."
        actions={
          <Button href="/members/new" variant="primary">
            <PlusIcon size={16} />
            New Member
          </Button>
        }
      />

      {/* --- Filters: search and status, in their own card ----------------- */}
      <section className={styles.filters} aria-label="Filter members">
        {/* useSearchParams needs a Suspense boundary around it so the rest of
            the page can still be prerendered. */}
        <Suspense fallback={null}>
          <SearchInput
            placeholder="Search members..."
            label="Search members by name, phone or email"
          />
          <FilterTabs
            param="status"
            active={filter}
            defaultValue={DEFAULT_MEMBER_FILTER}
            label="Filter members by membership status"
            options={MEMBER_FILTERS.map((option) => ({
              ...option,
              icon: FILTER_ICONS[option.value],
              count: counts[option.value] ?? 0,
            }))}
          />
        </Suspense>
      </section>

      {/* --- The list: its count and PDF button, then the members ---------- */}
      <Card flush tone="primary">
        <div className={styles.listHeader}>
          <p className={styles.count}>
            <strong>
              {members.length} {members.length === 1 ? "member" : "members"}
            </strong>
            <span className={styles.countDetail}>
              {filterLabel}
              {search ? ` · matching "${search}"` : ""}
            </span>
          </p>
          {/* The list as shown - same filter and search - as a PDF. */}
          <DownloadPdfButton
            list="members"
            params={{ status: filter, q: search }}
            title={`Members - ${filterLabel}`}
          />
        </div>

        <MemberTable
          members={members}
          isSearching={Boolean(search)}
          filter={filter}
        />
      </Card>
    </div>
  );
}
