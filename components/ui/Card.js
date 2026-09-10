import styles from "./Card.module.css";

/**
 * A raised surface. Cards are the main way depth is expressed in this UI:
 * a lighter background than the page, a border, and a soft shadow.
 *
 * @param {boolean} flush drop the body padding, for tables that reach the edge
 */
export default function Card({
  title,
  description,
  action,
  flush = false,
  children,
  className = "",
}) {
  return (
    <section className={`${styles.card} ${className}`}>
      {(title || action) && (
        <header className={styles.header}>
          <div>
            {title && <h2 className={styles.title}>{title}</h2>}
            {description && <p className={styles.description}>{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={flush ? styles.bodyFlush : styles.body}>{children}</div>
    </section>
  );
}
