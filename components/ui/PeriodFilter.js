"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./PeriodFilter.module.css";

const ALL = "all";

/**
 * "2026-10" -> { long: "October", short: "Oct" }, with the year added when it
 * is not this year's. Phones show the short name so more tiles fit.
 * en-US gives "Sep" rather than en-GB's "Sept".
 */
function monthName(value, currentYear) {
  const date = new Date(`${value}-01T00:00:00Z`);
  const format = (month) => new Intl.DateTimeFormat("en-US", { month, timeZone: "UTC" }).format(date);
  const year = value.slice(0, 4) === currentYear ? "" : ` ${value.slice(0, 4)}`;
  return { long: format("long") + year, short: format("short") + year };
}

/**
 * Filters a list by date - Payment History and History Logs.
 *
 *   [All time] [October] [September] [August] [July] …   ← swipe for more
 *   From [date]  To [date]                [Clear] [Apply]
 *
 * Two ways to pick, both always on screen and never locked:
 *   - a strip of tiles: All time and the last twelve months;
 *   - a custom From / To range underneath.
 * Whichever side is not in use is faded, but still works: picking a month
 * replaces a custom range, and applying a range replaces the month.
 *
 * It filters nothing itself. It writes the period into the URL (`?month=` or
 * `?from=&to=`) and the page re-runs on the server, so a filtered view can be
 * bookmarked. Other query parameters, such as a search, are kept - except
 * `?page=`, since a different period starts again from its first page.
 *
 * @param {{value: string, label: string}[]} options the months, newest first,
 *        from periodOptions()
 * @param {object} period the period currently applied, from resolvePeriod()
 */
export default function PeriodFilter({ id = "period", options, period }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const stripRef = useRef(null);
  // Which ends of the month strip have more tiles past them - for the arrows.
  const [more, setMore] = useState({ left: false, right: false });

  const isCustom = period.mode === "custom";
  const active = period.mode === "month" ? period.month : isCustom ? null : ALL;
  const [from, setFrom] = useState(isCustom ? period.from ?? "" : "");
  const [to, setTo] = useState(isCustom ? period.to ?? "" : "");

  // Keep the dates in step when the period changes from outside (Back, a link).
  useEffect(() => {
    setFrom(isCustom ? period.from ?? "" : "");
    setTo(isCustom ? period.to ?? "" : "");
  }, [isCustom, period.from, period.to]);

  // Bring the chosen month into view - it may be far along the strip.
  useEffect(() => {
    const strip = stripRef.current;
    const tile = strip?.querySelector("[aria-checked='true']");
    if (!strip || !tile) return;
    const left = tile.offsetLeft - strip.offsetLeft - 8;
    if (left < strip.scrollLeft || left + tile.offsetWidth > strip.scrollLeft + strip.clientWidth) {
      strip.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
  }, [active]);

  // Show an arrow only where there is more to scroll to.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const update = () =>
      setMore({
        left: strip.scrollLeft > 4,
        right: strip.scrollLeft + strip.clientWidth < strip.scrollWidth - 4,
      });
    update();
    strip.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      strip.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  /** Moves the strip about three tiles along. */
  const scrollBy = (direction) =>
    stripRef.current?.scrollBy({ left: direction * 360, behavior: "smooth" });

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

  const choose = (value) => apply(value === ALL ? {} : { month: value });

  const handleApply = (event) => {
    event.preventDefault();
    apply({ from, to });
  };

  const handleClear = () => {
    setFrom("");
    setTo("");
    apply({});
  };

  // A month older than the strip (an old bookmark) still gets its own tile.
  const extraMonth =
    period.mode === "month" && !options.some((option) => option.value === period.month)
      ? [{ value: period.month, label: period.month.slice(0, 4) }]
      : [];

  const currentYear = options[0]?.value.slice(0, 4);
  const tiles = [
    { value: ALL, title: { long: "All time", short: "All time" }, hint: "Everything" },
    ...[...options, ...extraMonth].map((option) => ({
      value: option.value,
      title: monthName(option.value, currentYear),
      hint: option.label,
    })),
  ];

  return (
    <div className={`${styles.filter} ${isPending ? styles.pending : ""}`}>
      {/* --- All time and the months: swipe sideways for more ------------ */}
      <div
        className={[
          styles.stripWrap,
          isCustom ? styles.faded : "",
          more.left ? styles.moreLeft : "",
          more.right ? styles.moreRight : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Arrows for a mouse; phones just swipe. */}
        {more.left && (
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowLeft}`}
            onClick={() => scrollBy(-1)}
            aria-label="Earlier periods"
          >
            ‹
          </button>
        )}
        {more.right && (
          <button
            type="button"
            className={`${styles.arrow} ${styles.arrowRight}`}
            onClick={() => scrollBy(1)}
            aria-label="Older months"
          >
            ›
          </button>
        )}
        <div
          ref={stripRef}
          className={styles.strip}
          role="radiogroup"
          aria-label="Period"
          id={id}
        >
          {tiles.map((tile) => (
            <button
              key={tile.value}
              type="button"
              role="radio"
              aria-checked={active === tile.value}
              className={`${styles.tile} ${active === tile.value ? styles.active : ""}`}
              onClick={() => choose(tile.value)}
            >
              <span className={styles.tileTitle}>
                <span className={styles.long}>{tile.title.long}</span>
                <span className={styles.short} aria-hidden="true">
                  {tile.title.short}
                </span>
              </span>
              <span className={styles.tileHint}>{tile.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- Or a range of dates ---------------------------------------- */}
      <form
        onSubmit={handleApply}
        className={`${styles.range} ${isCustom ? styles.rangeActive : styles.faded}`}
        aria-label="Custom date range"
      >
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
          {isCustom && (
            <button type="button" className={styles.clear} onClick={handleClear}>
              Clear
            </button>
          )}
          <button type="submit" className={styles.apply} disabled={!from && !to}>
            Apply
          </button>
        </div>
      </form>
    </div>
  );
}
