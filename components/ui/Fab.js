import Link from "next/link";
import styles from "./Fab.module.css";

/**
 * A floating round action button in the bottom-right corner, just above the
 * tab bar - the phone and tablet home for a page's main action ("Add
 * Member"). Hidden on desktop, where the same action sits in the page header.
 */
export default function Fab({ href, label, icon: FabIcon }) {
  return (
    <Link href={href} className={styles.fab} aria-label={label} title={label}>
      <FabIcon size={24} />
    </Link>
  );
}
