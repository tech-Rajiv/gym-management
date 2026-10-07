import Link from "next/link";
import FounderLogout from "@/components/founder/FounderLogout";
import { APP_NAME } from "@/lib/config";
import { getInitials, titleCase } from "@/lib/utils/format";
import styles from "@/app/founder/founder.module.css";

/**
 * The founder app bar. Adding a gym lives with the gym list, not here.
 */
export default function FounderBar({ name }) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  const first = parts[0] || "";
  const last = parts.slice(1).join(" ");

  return (
    <header className={styles.header}>
      <Link href="/founder" className={styles.brand} aria-label={`${APP_NAME} founder`}>
        <span className={styles.role}>Founder</span>
        <span className={styles.brandName}>{APP_NAME}</span>
      </Link>

      <span className={styles.spacer} />

      <span className={styles.who}>
        <span className={styles.avatar} aria-hidden="true">
          {getInitials(first, last)}
        </span>
        <span className={styles.whoName}>{titleCase(first)}</span>
      </span>

      <FounderLogout />
    </header>
  );
}
