"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MEMBER_FILTERS, DEFAULT_MEMBER_FILTER } from "@/lib/utils/membershipStatus";
import styles from "./MemberFilters.module.css";

/**
 * Status tabs for the members list.
 *
 * Like the search box, this filters nothing itself - it writes `?status=` into
 * the URL and lets the page re-run on the server, so PostgreSQL does the work
 * and the filtered view can be bookmarked or shared. It is also what makes the
 * dashboard's stat cards able to link straight to a filtered list.
 *
 * Switching filters keeps any active search, so the two combine.
 *
 * @param {string} active  the filter currently applied
 * @param {object} counts  how many members each filter would show
 */
export default function MemberFilters({ active, counts }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const applyFilter = (value) => {
    const params = new URLSearchParams(searchParams);

    // "All" is the default, so it is left out of the URL entirely rather than
    // written as ?status=all.
    if (value === DEFAULT_MEMBER_FILTER) {
      params.delete("status");
    } else {
      params.set("status", value);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params}`, { scroll: false });
    });
  };

  return (
    <div
      className={`${styles.filters} ${isPending ? styles.pending : ""}`}
      role="group"
      aria-label="Filter members by membership status"
    >
      {MEMBER_FILTERS.map((filter) => {
        const isActive = filter.value === active;
        return (
          <button
            key={filter.value}
            type="button"
            onClick={() => applyFilter(filter.value)}
            aria-pressed={isActive}
            className={`${styles.filter} ${isActive ? styles.filterActive : ""}`}
          >
            {filter.label}
            <span className={styles.count}>{counts[filter.value] ?? 0}</span>
          </button>
        );
      })}
    </div>
  );
}
