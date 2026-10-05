"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { NAV_SECTIONS, isNavActive } from "./navigation";
import { DumbbellIcon } from "@/components/ui/icons";
import styles from "./Sidebar.module.css";

/**
 * The desktop navigation.
 *
 * A Client Component because it needs `usePathname` to highlight the current
 * section. Below the tablet breakpoint it is hidden and BottomNav takes over,
 * so phones get thumb-reachable tabs instead of a drawer behind a menu button.
 */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar} aria-label="Main navigation">
      {/* The brand always leads home. */}
      <Link href="/dashboard" className={styles.brand} aria-label={`${APP_NAME} - go to the dashboard`}>
        <span className={styles.logo}>
          <DumbbellIcon size={18} />
        </span>
        <span className={styles.brandText}>
          <span className={styles.brandName}>{APP_NAME}</span>
          <span className={styles.brandTag}>Management</span>
        </span>
      </Link>

      <nav className={styles.nav}>
        {NAV_SECTIONS.map((section, index) => (
          <div key={section.label ?? index}>
            {section.label && <p className={styles.sectionLabel}>{section.label}</p>}
            {section.items.map(({ href, label, icon: NavIcon }) => {
              const active = isNavActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`${styles.link} ${active ? styles.linkActive : ""}`}
                >
                  <NavIcon size={18} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>Version 1.1</div>
    </aside>
  );
}
