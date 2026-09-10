import styles from "./Badge.module.css";

/**
 * A status pill.
 *
 * Colour alone never carries the meaning - the label is always spelled out,
 * so it still reads correctly in greyscale or to a colour-blind user.
 *
 * @param {'success'|'warning'|'danger'|'neutral'|'primary'} variant
 */
export default function Badge({ children, variant = "neutral", dot = true }) {
  return (
    <span className={`${styles.badge} ${styles[variant]}`}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
