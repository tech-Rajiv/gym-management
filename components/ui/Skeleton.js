import styles from "./Skeleton.module.css";

/**
 * A grey placeholder block.
 *
 * Loading states use these rather than the word "Loading" alone, because a
 * placeholder in the shape of the eventual content stops the page jumping
 * around when the real data arrives.
 */
export default function Skeleton({ variant = "text", width, height, className = "" }) {
  return (
    <div
      className={`${styles.skeleton} ${styles[variant] ?? ""} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/** Several placeholder rows, for a table that has not loaded yet. */
export function SkeletonRows({ count = 5 }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} variant="row" />
      ))}
    </div>
  );
}

export { styles as skeletonStyles };
