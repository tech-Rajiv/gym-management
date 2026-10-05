import Link from "next/link";
import styles from "./PageHeader.module.css";

/**
 * The title block every page starts with, plus optional back link and actions.
 *
 * @param {boolean} [banner]  the main pages (Members, Payments, Plans,
 *        History) open with the same gradient banner as the dashboard: a
 *        small `eyebrow` line with a key figure, the title, the description,
 *        and the page's action as a white pill. Form pages keep the plain title.
 * @param {string}  [eyebrow] e.g. "14 members" - shown above a banner title
 * @param {node}    [icon]    the section's icon (the same one as in the
 *                            navigation), shown in a tile beside a banner title
 */
export default function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "Back",
  banner = false,
  eyebrow,
  icon,
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

      {banner ? (
        // A slim rectangle: the key figure, then the title with its action
        // on the same row, then one short line of description.
        <section className={styles.banner}>
          {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
          <h1 className={styles.bannerTitle}>
            {icon && (
              <span className={styles.titleIcon} aria-hidden="true">
                {icon}
              </span>
            )}
            {title}
          </h1>
          {actions && <div className={styles.bannerActions}>{actions}</div>}
          {description && <p className={styles.bannerDescription}>{description}</p>}
        </section>
      ) : (
        <div className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          {actions && <div className={styles.actions}>{actions}</div>}
          {description && <p className={styles.description}>{description}</p>}
        </div>
      )}
    </div>
  );
}
