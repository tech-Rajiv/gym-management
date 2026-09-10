import Link from "next/link";
import styles from "./PageHeader.module.css";

/** The title block every page starts with, plus optional back link and actions. */
export default function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Back",
}) {
  return (
    <div>
      {backHref && (
        <Link href={backHref} className={styles.back}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M10 12L6 8l4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {backLabel}
        </Link>
      )}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
    </div>
  );
}
