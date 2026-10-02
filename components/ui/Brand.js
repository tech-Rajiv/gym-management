import { DumbbellIcon } from "./icons";
import styles from "./Brand.module.css";

/**
 * The AURA FITNESS mark: the dumbbell in an amber glowing tile, and the
 * wordmark - "AURA" in bold white, "FITNESS" in gold gradient text.
 *
 * @param {'sm'|'md'|'lg'} size
 * @param {string} [tagline] small text under the wordmark
 */
export default function Brand({ size = "md", tagline }) {
  return (
    <span className={`${styles.brand} ${styles[size]}`}>
      <span className={styles.logo} aria-hidden="true">
        <DumbbellIcon size={size === "lg" ? 24 : size === "sm" ? 16 : 18} />
      </span>
      <span className={styles.text}>
        <span className={styles.wordmark}>
          <span className={styles.aura}>AURA</span>{" "}
          <span className={styles.fitness}>FITNESS</span>
        </span>
        {tagline && <span className={styles.tagline}>{tagline}</span>}
      </span>
    </span>
  );
}
