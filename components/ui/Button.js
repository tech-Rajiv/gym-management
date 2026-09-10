import Link from "next/link";
import styles from "./Button.module.css";

/**
 * The application's only button.
 *
 * Passing `href` renders a Next.js Link styled as a button, so a navigation
 * that looks like a button is still a real link - it opens in a new tab, it is
 * announced correctly, and it works without JavaScript.
 *
 * @param {'primary'|'secondary'|'ghost'|'danger'} variant
 */
export default function Button({
  children,
  variant = "secondary",
  size,
  href,
  fullWidth = false,
  className = "",
  ...props
}) {
  const classNames = [
    styles.button,
    styles[variant],
    size === "small" ? styles.small : "",
    fullWidth ? styles.fullWidth : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (href) {
    return (
      <Link href={href} className={classNames} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classNames} {...props}>
      {children}
    </button>
  );
}
