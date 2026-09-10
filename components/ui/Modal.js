"use client";

import { useEffect, useRef } from "react";
import styles from "./Modal.module.css";

/**
 * A modal dialog.
 *
 * Built on the native <dialog> element rather than a div overlay, which means
 * the browser handles the parts that are easy to get wrong: focus moves into
 * the dialog and comes back on close, the rest of the page is inert, and
 * Escape closes it.
 */
export default function Modal({ open, onClose, title, children, footer }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Escape and the backdrop both fire the dialog's own close event, so the
  // parent's state is kept in step from one place.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose?.();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  /** Clicking the backdrop lands on the dialog element itself, not its content. */
  const handleBackdropClick = (event) => {
    if (event.target === dialogRef.current) onClose?.();
  };

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      onClick={handleBackdropClick}
      aria-labelledby="modal-title"
    >
      <div className={styles.header}>
        <h2 id="modal-title" className={styles.title}>
          {title}
        </h2>
      </div>
      <div className={styles.body}>{children}</div>
      {footer && <div className={styles.footer}>{footer}</div>}
    </dialog>
  );
}
