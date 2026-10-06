import { CheckIcon, CloseIcon } from "@/components/ui/icons";
import { cardioLabel } from "@/lib/utils/plans";
import styles from "./CardioBadge.module.css";

/**
 * "✓ Cardio included" in green or "✕ No cardio" in grey - the one thing that
 * sets two plans of the same length apart, so it is shown as a sign, not a
 * line of small print.
 *
 * @param {'small'|'large'} [size]
 */
export default function CardioBadge({ included, size = "small" }) {
  const Mark = included ? CheckIcon : CloseIcon;
  return (
    <span className={`${styles.badge} ${included ? styles.included : styles.excluded} ${styles[size]}`}>
      <span className={styles.mark} aria-hidden="true">
        <Mark size={size === "large" ? 14 : 12} />
      </span>
      {cardioLabel(included)}
    </span>
  );
}
