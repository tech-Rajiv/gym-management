"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./RowMenu.module.css";

function MoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
    </svg>
  );
}

/**
 * A "⋯" button that opens a short menu of a row's less frequent actions -
 * View, Edit, Mark as left - so the row itself only carries the everyday ones.
 *
 * Closes on a choice, a click anywhere else, Escape, or scrolling.
 *
 * The menu is positioned against the window (position: fixed), so a card
 * that clips its contents cannot cut it off, and it opens upwards when the
 * row is too near the bottom of the screen for it to fit below.
 *
 * @param {string} label  what the menu is for, for screen readers
 * @param {{label: string, icon?: React.ReactNode, href?: string,
 *          onClick?: Function, danger?: boolean}[]} items
 *        `icon` is an element (<EyeIcon size={16} />), not a component, so a
 *        Server Component can build the items too. `onClick` only works when
 *        the caller is itself a Client Component.
 */
export default function RowMenu({ label, items }) {
  // Where the open menu sits on screen, or null while it is closed.
  const [position, setPosition] = useState(null);
  const ref = useRef(null);
  const open = position !== null;

  const toggle = (event) => {
    if (open) {
      setPosition(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const roomBelow = window.innerHeight - rect.bottom;
    const estimatedHeight = items.length * 46 + 12;
    setPosition({
      right: window.innerWidth - rect.right,
      ...(roomBelow > estimatedHeight + 16
        ? { top: rect.bottom + 6 }
        : { bottom: window.innerHeight - rect.top + 6 }),
    });
  };

  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (event.type === "keydown" && event.key !== "Escape") return;
      if (event.type === "pointerdown" && ref.current?.contains(event.target)) return;
      setPosition(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
      >
        <MoreIcon />
      </button>

      {open && (
        <div className={styles.menu} role="menu" style={position}>
          {items.map(({ label: itemLabel, icon, href, onClick, danger }) => {
            const className = `${styles.item} ${danger ? styles.danger : ""}`;
            const content = (
              <>
                {icon}
                {itemLabel}
              </>
            );
            return href ? (
              <Link key={itemLabel} href={href} className={className} role="menuitem">
                {content}
              </Link>
            ) : (
              <button
                key={itemLabel}
                type="button"
                className={className}
                role="menuitem"
                onClick={() => {
                  setPosition(null);
                  onClick?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
