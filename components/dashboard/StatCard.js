import styles from "./StatCard.module.css";

/**
 * One summary figure on the dashboard.
 *
 * @param {boolean} accent draws attention to a number that needs action,
 *                         such as memberships about to expire
 */
export default function StatCard({ label, value, hint, icon: StatIcon, accent = false }) {
  return (
    <article className={styles.card}>
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
    </article>
  );
}
