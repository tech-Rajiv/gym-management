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
  PlusIcon,
  MembersIcon,
  UserPlusIcon,
  ClockIcon,
  CalendarXIcon,
  UserMinusIcon,
} from "@/components/ui/icons";
import Fab from "@/components/ui/Fab";
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
  await requireAdmin();
  const { q: search = "", status } = await searchParams;
  const filter = normalizeMemberFilter(status);

  const [members, counts] = await Promise.all([
    getMembers({ search, status: filter }),
    getMemberStatusCounts({ search }),
  ]);

  return (
    <div>
      <PageHeader
        title="Manage Members"
        description="View, add and update the people training at your gym."
        actions={
          <Button href="/members/new" variant="primary" className="desktop-only">
            <PlusIcon size={16} />
            Add Member
          </Button>
        }
      />

      <Card flush tone="primary">
        {/* useSearchParams needs a Suspense boundary around it so the rest of
            the page can still be prerendered. */}
        <Suspense fallback={null}>
          <div className={styles.toolbar}>
            <SearchInput
              placeholder="Search members..."
              label="Search members by name, phone or email"
            />
            <span className={styles.count}>
              {members.length} {members.length === 1 ? "member" : "members"}
              {search ? ` matching "${search}"` : ""}
            </span>
          </div>

          <div className={styles.filterBar}>
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
          </div>
        </Suspense>

        <MemberTable
          members={members}
          isSearching={Boolean(search)}
          filter={filter}
        />
      </Card>

      {/* On phones "Add Member" floats in the corner instead of the header. */}
      <Fab href="/members/new" label="Add Member" icon={PlusIcon} />
    </div>
  );
}
