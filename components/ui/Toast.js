"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./Toast.module.css";

/**
 * A short message at the bottom of the screen for something happening in the
 * background - "Preparing PDF…", "✓ Report sent", or why it failed.
 *
 *   const [toast, setToast] = useToast();
 *   setToast({ status: "loading", message: "Sending…" });
 *   setToast({ status: "done", message: "Sent" });   // clears itself after 4s
 *   ...
 *   <Toast toast={toast} />
 *
 * It is drawn at page level (a portal into <body>), so no card - or a card's
 * hover animation - can move or clip it.
 */

/** The toast's state, clearing itself after a finished or failed message. */
export function useToast() {
  const [toast, setToast] = useState({ status: "idle" });

  useEffect(() => {
    if (toast.status !== "done" && toast.status !== "error") return;
    // An error stays a little longer, so there is time to read it.
    const timer = setTimeout(() => setToast({ status: "idle" }), toast.status === "error" ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return [toast, setToast];
}

/** A small spinning ring, in the current text colour. */
export function Spinner() {
  return <span className={styles.spinner} aria-hidden="true" />;
}

/** @param {{status: 'idle'|'loading'|'done'|'error', message?: string}} toast */
export default function Toast({ toast }) {
  if (toast.status === "idle" || typeof document === "undefined") return null;

  return createPortal(
    <div className={`${styles.toast} ${styles[toast.status]}`} role="status">
      {toast.status === "loading" && <Spinner />}
      {toast.status === "done" && "✓ "}
      {toast.message}
    </div>,
    document.body
  );
}
