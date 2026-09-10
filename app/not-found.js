import Button from "@/components/ui/Button";
import styles from "./not-found.module.css";

/** Shown for any URL that does not exist, and by any page calling notFound(). */
export default function NotFound() {
  return (
    <div className={styles.wrapper}>
      <p className={styles.code}>404</p>
      <h1>Page not found</h1>
      <p className={styles.description}>
        The page you are looking for does not exist or may have been removed.
      </p>
      <div className={styles.action}>
        <Button href="/dashboard" variant="primary">
          Back to dashboard
        </Button>
      </div>
    </div>
  );
}
