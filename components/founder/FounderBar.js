import Link from "next/link";
import FounderLogout from "@/components/founder/FounderLogout";
import { BuildingIcon } from "@/components/ui/icons";
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
      <Link href="/founder" className={styles.brand} aria-label="Founder">
        <span className={styles.brandMark} aria-hidden="true">
          <BuildingIcon size={16} />
        </span>
        <span className={styles.brandName}>Founder</span>
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
