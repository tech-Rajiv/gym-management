import styles from "./EmptyState.module.css";

/**
 * Shown wherever a list has nothing in it.
 *
 * An empty table with no explanation looks like a bug, so every empty list in
 * the application says what is missing and, where it makes sense, offers the
 * action that would fill it.
 */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className={styles.empty}>
      {icon && (
        <div className={styles.icon} aria-hidden="true">
          {icon}
        </div>
      )}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
