import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";
import styles from "./StatCard.module.css";

/**
 * One summary figure on the dashboard - a solid coloured tile.
 *
 * Passing `href` turns the whole card into a link to the list it summarises -
 * clicking "Expired" opens the members page already filtered to them. It
 * renders as a real anchor, so it can be opened in a new tab and is announced
 * as a link rather than a decorative box.
 *
 * On desktop the tiles sit side by side with the number large; on phones each
 * becomes a full-width row - icon, label, number - so none is squeezed.
 *
 * @param {'primary'|'warning'|'danger'} tone the card's colour
 */
export default function StatCard({
  label,
  value,
  hint,
  icon: StatIcon,
  tone = "primary",
  href,
}) {
  const content = (
    <>
      {StatIcon && (
        <span className={styles.icon}>
          <StatIcon size={20} />
        </span>
      )}
      <div className={styles.text}>
        <p className={styles.label}>{label}</p>
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
      <p className={styles.value}>{value}</p>
      {href && (
        <span className={styles.more} aria-hidden="true">
          View list <ArrowRightIcon size={14} />
        </span>
      )}
    </>
  );

  const className = `${styles.card} ${styles[tone]} ${href ? styles.cardLink : ""}`;

  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <article className={className}>{content}</article>
  );
}
