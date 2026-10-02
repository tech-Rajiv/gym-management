"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "./navigation";
import styles from "./BottomNav.module.css";

/**
 * The phone and tablet navigation: a tab bar fixed to the bottom of the
 * screen, where a thumb can reach it. Hidden on desktop, where the Sidebar
 * shows the same items.
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.bar} aria-label="Main navigation">
      {NAV_ITEMS.map(({ href, label, short, icon: NavIcon }) => {
        const active = isNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            aria-label={label}
            className={`${styles.item} ${active ? styles.itemActive : ""}`}
          >
            <NavIcon size={21} />
            <span className={styles.label}>{short ?? label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
