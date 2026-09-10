import Link from "next/link";
import { ArrowRightIcon } from "@/components/ui/icons";
import styles from "./StatCard.module.css";

/**
 * One summary figure on the dashboard.
 *
 * Passing `href` turns the whole card into a link to the list it summarises -
 * clicking "Active Members" opens the members page already filtered to them.
 * It renders as a real anchor, so it can be opened in a new tab and is
 * announced as a link rather than a decorative box.
 *
 * @param {boolean} accent draws attention to a number that needs action,
 *                         such as memberships about to expire
 */
export default function StatCard({
  label,
  value,
  hint,
  icon: StatIcon,
  accent = false,
  href,
}) {
  const content = (
    <>
      {StatIcon && (
        <span className={`${styles.icon} ${accent ? styles.iconAccent : ""}`}>
          <StatIcon size={19} />
        </span>
      )}
      <div className={styles.body}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
        {hint && <p className={styles.hint}>{hint}</p>}
      </div>
      {href && (
        <span className={styles.arrow} aria-hidden="true">
          <ArrowRightIcon size={15} />
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`${styles.card} ${styles.cardLink}`}>
        {content}
      </Link>
    );
  }

  return <article className={styles.card}>{content}</article>;
}
