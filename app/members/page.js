import { Suspense } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import MemberTable from "@/components/members/MemberTable";
import MemberSearch from "@/components/members/MemberSearch";
import MemberFilters from "@/components/members/MemberFilters";
import { getMembers, getMemberStatusCounts } from "@/lib/db/members";
import { normalizeMemberFilter } from "@/lib/utils/membershipStatus";
import { PlusIcon } from "@/components/ui/icons";
import styles from "./members.module.css";

export const metadata = { title: "Members" };

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
          <Button href="/members/new" variant="primary">
            <PlusIcon size={16} />
            Add Member
          </Button>
        }
      />

      <Card flush>
        {/* useSearchParams needs a Suspense boundary around it so the rest of
            the page can still be prerendered. */}
        <Suspense fallback={null}>
          <div className={styles.toolbar}>
            <MemberSearch />
            <span className={styles.count}>
              {members.length} {members.length === 1 ? "member" : "members"}
              {search ? ` matching "${search}"` : ""}
            </span>
          </div>

          <div className={styles.filterBar}>
            <MemberFilters active={filter} counts={counts} />
          </div>
        </Suspense>

        <MemberTable
          members={members}
          isSearching={Boolean(search)}
          filter={filter}
        />
      </Card>
    </div>
  );
}
