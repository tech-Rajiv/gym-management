import { Suspense } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import MemberTable from "@/components/members/MemberTable";
import MemberSearch from "@/components/members/MemberSearch";
import { getMembers } from "@/lib/db/members";
import { PlusIcon } from "@/components/ui/icons";
import styles from "./members.module.css";

export const metadata = { title: "Members" };

/** Member data changes as soon as the owner edits it, so never serve a cached copy. */
export const dynamic = "force-dynamic";

/**
 * Manage Members.
 *
 * The search term is read from the URL rather than component state. The page
 * re-runs on the server whenever `?q=` changes and PostgreSQL does the
 * filtering, which means the browser never holds the full member list and a
 * search survives a refresh.
 *
 * `searchParams` is a promise in this version of Next.js and has to be awaited.
 */
export default async function MembersPage({ searchParams }) {
  const { q: search = "" } = await searchParams;
  const members = await getMembers({ search });

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
        <div className={styles.toolbar}>
          {/* useSearchParams needs a Suspense boundary around it so the rest of
              the page can still be prerendered. */}
          <Suspense fallback={null}>
            <MemberSearch />
          </Suspense>
          <span className={styles.count}>
            {members.length} {members.length === 1 ? "member" : "members"}
            {search ? ` matching "${search}"` : ""}
          </span>
        </div>

        <MemberTable members={members} isSearching={Boolean(search)} />
      </Card>
    </div>
  );
}
