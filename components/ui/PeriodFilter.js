"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SearchSelect from "./SearchSelect";
import { CalendarIcon } from "./icons";
import styles from "./PeriodFilter.module.css";

const ALL = "all";
const CUSTOM = "custom";

/**
 * Filters a list by date: All time, This month, Last month, or a custom range.
 * Used by Payment History and History Logs.
 *
 * It filters nothing itself. It writes the period into the URL (`?month=` or
 * `?from=&to=`) and the page re-runs on the server, so a filtered view can be
 * bookmarked. Other query parameters, such as a search, are kept - except
 * `?page=`, since a different period starts again from its first page.
 *
 * A custom range waits for its dates and Apply; once one is applied, Clear
 * goes back to All time.
 *
 * @param {{value: string, label: string}[]} options the months to offer -
 *        This month and Last month, from periodOptions()
 * @param {object} period the period currently applied, from resolvePeriod()
 */
export default function PeriodFilter({ id = "period", options, period }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [choice, setChoice] = useState(
    period.mode === "month" ? period.month : period.mode === "custom" ? CUSTOM : ALL
  );
  const [from, setFrom] = useState(period.mode === "custom" ? period.from ?? "" : "");
  const [to, setTo] = useState(period.mode === "custom" ? period.to ?? "" : "");

  /** Rewrites the period in the URL, leaving every other parameter alone. */
  const apply = (next) => {
    const params = new URLSearchParams(searchParams);
    for (const key of ["month", "from", "to", "page"]) params.delete(key);
    for (const [key, value] of Object.entries(next)) if (value) params.set(key, value);
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  const handleChoice = (value) => {
    setChoice(value);
    // A custom range waits for its dates and the Apply button.
    if (value === CUSTOM) return;
    apply(value === ALL ? {} : { month: value });
  };

  const handleApply = (event) => {
    event.preventDefault();
    apply({ from, to });
  };

  /** Drops the custom range and goes back to All time. */
  const handleClear = () => {
    setChoice(ALL);
    setFrom("");
    setTo("");
    apply({});
  };

  // A month that is no longer offered (an old bookmark) still shows its name.
  const extraMonth =
    period.mode === "month" && !options.some((option) => option.value === period.month)
      ? [{ value: period.month, label: period.label }]
      : [];

  return (
    <div className={`${styles.filter} ${isPending ? styles.pending : ""}`}>
      <SearchSelect
        id={id}
        className={styles.picker}
        icon={CalendarIcon}
        placeholder="Period"
        options={[
          { value: ALL, label: "All time" },
          ...options,
          ...extraMonth,
          { value: CUSTOM, label: "Custom range…" },
        ]}
        value={choice}
        onChange={handleChoice}
      />

      {choice === CUSTOM && (
        <form onSubmit={handleApply} className={styles.range}>
          <label className={styles.dateField}>
            <span>From</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
              className={styles.date}
            />
          </label>
          <label className={styles.dateField}>
            <span>To</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
              className={styles.date}
            />
          </label>
          <div className={styles.rangeActions}>
            <button type="submit" className={styles.apply} disabled={!from && !to}>
              Apply
            </button>
            {period.mode === "custom" && (
              <button type="button" className={styles.clear} onClick={handleClear}>
                Clear
              </button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
