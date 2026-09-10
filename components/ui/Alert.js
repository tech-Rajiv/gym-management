import styles from "./Alert.module.css";

/**
 * A message about something that just happened - usually a failed save.
 *
 * `role="alert"` makes a screen reader announce it as soon as it appears,
 * which matters because it is normally the result of a form submission the
 * user is waiting on.
 */
export default function Alert({ children, variant = "danger" }) {
  return (
    <div className={`${styles.alert} ${styles[variant]}`} role="alert">
      <svg
        className={styles.icon}
        width="15"
        height="15"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M8 5v3.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <circle cx="8" cy="11" r="0.8" fill="currentColor" />
      </svg>
      <span>{children}</span>
    </div>
  );
}
