import styles from "./Card.module.css";

/**
 * A raised surface. Cards are the main way depth is expressed in this UI:
 * a lighter background than the page, a border, and a soft shadow.
 *
 * @param {boolean} flush drop the body padding, for tables that reach the edge
 * @param {'primary'|'warning'|'danger'|'success'} [tone] gives the card its
 *        own colour - a strip along the top, a tinted header with the icon in
 *        a coloured tile, and table headings in the same tint - so cards
 *        stacked one after another are easy to tell apart
 * @param {Function} [icon] an icon component shown beside the title
 */
export default function Card({
  title,
  description,
  action,
  flush = false,
  tone,
  icon: CardIcon,
  children,
  className = "",
}) {
  return (
    <section
      className={[styles.card, tone ? styles.toned : "", tone ? styles[tone] : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      {(title || action) && (
        <header className={styles.header}>
          <div className={styles.heading}>
            {CardIcon && (
              <span className={styles.icon} aria-hidden="true">
                <CardIcon size={18} />
              </span>
            )}
            <div>
              {title && <h2 className={styles.title}>{title}</h2>}
              {description && <p className={styles.description}>{description}</p>}
            </div>
          </div>
          {action}
        </header>
      )}
      <div className={flush ? styles.bodyFlush : styles.body}>{children}</div>
    </section>
  );
}
