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
 *
 * @param {boolean} [dismissible] set false while work is in flight, so the
 *                                dialog cannot be dismissed part-way through
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  dismissible = true,
}) {
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

  // Escape fires `cancel` before `close`. Blocking it there stops the browser
  // closing the dialog behind React's back, which would otherwise leave the
  // element shut while this component still believed it was open.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event) => {
      if (!dismissible) event.preventDefault();
    };
    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [dismissible]);

  // Whatever closed the dialog - Escape, the backdrop, or a button - ends up
  // here, so the parent's state is kept in step from one place.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose?.();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  /** Clicking the backdrop lands on the dialog element itself, not its content. */
  const handleBackdropClick = (event) => {
    if (dismissible && event.target === dialogRef.current) onClose?.();
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
