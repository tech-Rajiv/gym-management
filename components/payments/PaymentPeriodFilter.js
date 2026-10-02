"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SearchSelect from "@/components/ui/SearchSelect";
import { CalendarIcon } from "@/components/ui/icons";
import styles from "./PaymentPeriodFilter.module.css";

const ALL = "all";
const CUSTOM = "custom";

/**
 * Filters the payment history by date: All time, one month, or a custom range.
 *
 * Like the search box and the Cash / UPI tabs, it filters nothing itself. It
 * writes the period into the URL (`?month=` or `?from=&to=`) and the page
 * re-runs on the server, so a filtered view can be bookmarked. Other query
 * parameters - the search, the method - are kept.
 *
 * @param {{value: string, label: string}[]} months the months to offer
 * @param {object} period the period currently applied, from resolvePaymentPeriod
 */
export default function PaymentPeriodFilter({ months, period }) {
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
    for (const key of ["month", "from", "to"]) params.delete(key);
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

  return (
    <div className={`${styles.filter} ${isPending ? styles.pending : ""}`}>
      <SearchSelect
        id="payment-period"
        className={styles.picker}
        icon={CalendarIcon}
        placeholder="Payment period"
        options={[
          { value: ALL, label: "All time" },
          ...months.map((month) => ({ ...month, group: "Month" })),
          { value: CUSTOM, label: "Custom range…", group: "Other" },
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
          <button type="submit" className={styles.apply} disabled={!from && !to}>
            Apply
          </button>
        </form>
      )}
    </div>
  );
}
