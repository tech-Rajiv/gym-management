"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./FilterTabs.module.css";

/**
 * A row of filter tabs that filters a server-rendered list.
 *
 * Like SearchInput, this filters nothing itself - it writes the chosen value
 * into the URL and lets the page re-run on the server, so PostgreSQL does the
 * work and the filtered view can be bookmarked or linked to. That is what lets
 * the dashboard's stat cards open a list already filtered.
 *
 * Any other query parameters are preserved, so a filter and a search combine.
 *
 * @param {string} param        the query parameter to write, e.g. "status"
 * @param {string} active       the value currently applied
 * @param {string} defaultValue the value meaning "no filter", left out of the URL
 * @param {{value: string, label: string, count?: number}[]} options
 */
export default function FilterTabs({
  param,
  active,
  defaultValue,
  options,
  label,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const applyFilter = (value) => {
    const params = new URLSearchParams(searchParams);

    // The default is left out of the URL entirely rather than written as
    // ?status=all, which keeps shared links clean.
    if (value === defaultValue) {
      params.delete(param);
    } else {
      params.set(param, value);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params}`, { scroll: false });
    });
  };

  return (
    <div
      className={`${styles.filters} ${isPending ? styles.pending : ""}`}
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const isActive = option.value === active;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => applyFilter(option.value)}
            aria-pressed={isActive}
            className={`${styles.filter} ${isActive ? styles.filterActive : ""}`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className={styles.count}>{option.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
