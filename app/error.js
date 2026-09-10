"use client";

import Button from "@/components/ui/Button";
import styles from "./not-found.module.css";

/**
 * The application's error boundary.
 *
 * Error boundaries must be Client Components - React needs to catch the error
 * as it renders and offer a way to try again.
 *
 * Note what is shown: a plain sentence, never `error.message`. A failure deep
 * in a query would otherwise put SQL, table names or connection details on
 * screen. The real error is logged on the server, where it belongs.
 */
export default function Error({ error, reset }) {
  console.error(error);

  return (
    <div className={styles.wrapper}>
      <p className={styles.code}>!</p>
      <h1>Something went wrong</h1>
      <p className={styles.description}>
        We could not load this page. This is usually a temporary problem with
        the database connection — please try again.
      </p>
      <div className={styles.action}>
        <Button variant="primary" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
