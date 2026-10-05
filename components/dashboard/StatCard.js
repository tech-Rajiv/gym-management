import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";
import DownloadPdfButton from "@/components/ui/DownloadPdfButton";
import styles from "./StatCard.module.css";

/**
 * One summary figure on the dashboard - a solid coloured tile.
 *
 * Passing `href` turns the whole card into a link to the list it summarises -
 * clicking "Expired" opens the members page already filtered to them. It
 * renders as a real anchor, so it can be opened in a new tab and is announced
 * as a link rather than a decorative box.
 *
 *   Desktop:  [icon] Label / hint ............ [PDF]
 *             42
 *             View list ->
 *
 *   Phone:    [icon] Label / hint ...... 42  [PDF]
 *
 * @param {'primary'|'warning'|'danger'|'success'} tone the card's colour
 * @param {{list: string, params?: object}} [pdf] adds a Download PDF button
 *        for the same list - see DownloadPdfButton
 */
export default function StatCard({
  label,
  value,
  hint,
  icon: StatIcon,
  tone = "primary",
  href,
  pdf,
}) {
  return (
    <article className={`${styles.card} ${styles[tone]} ${href ? styles.cardLink : ""}`}>
      {/* The whole card opens the list: an invisible link stretched over it.
          The PDF button sits above that link, so the two never nest and a
          click on the button never opens the list. */}
      {href && <Link href={href} className={styles.cover} aria-label={`${label}: view list`} />}

      <div className={styles.top}>
        {StatIcon && (
          <span className={styles.icon}>
            <StatIcon size={20} />
          </span>
        )}
        <div className={styles.text}>
          <p className={styles.label}>{label}</p>
          {hint && <p className={styles.hint}>{hint}</p>}
        </div>
        {pdf && (
          <div className={styles.pdf}>
            <DownloadPdfButton
              list={pdf.list}
              params={pdf.params}
              title={`Members - ${label}`}
              iconOnly
              variant="onColor"
            />
          </div>
        )}
      </div>

      <p className={styles.value}>{value}</p>

      {href && (
        <span className={styles.more} aria-hidden="true">
          View list <ArrowRightIcon size={14} />
        </span>
      )}
    </article>
  );
}
