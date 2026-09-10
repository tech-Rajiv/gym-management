"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAME } from "@/lib/config";
import { NAV_SECTIONS } from "./navigation";
import { DumbbellIcon } from "@/components/ui/icons";
import styles from "./Sidebar.module.css";

/**
 * The main navigation.
 *
 * A Client Component because it needs `usePathname` to highlight the current
 * section, and because it opens and closes on mobile. It renders whatever is
 * in NAV_SECTIONS, so new modules are added there rather than here.
 */
export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();

  /**
   * A link is active on its own page and on anything beneath it, so
   * /members/12/edit still highlights Members.
   */
  const isActive = (href) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {open && <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />}

      <aside
        className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}
        aria-label="Main navigation"
      >
        <div className={styles.brand}>
          <span className={styles.logo}>
            <DumbbellIcon size={18} />
          </span>
          <span className={styles.brandText}>
            <span className={styles.brandName}>{APP_NAME}</span>
            <span className={styles.brandTag}>Management</span>
          </span>
        </div>

        <nav className={styles.nav}>
          {NAV_SECTIONS.map((section, index) => (
            <div key={section.label ?? index}>
              {section.label && <p className={styles.sectionLabel}>{section.label}</p>}
              {section.items.map(({ href, label, icon: NavIcon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={`${styles.link} ${isActive(href) ? styles.linkActive : ""}`}
                >
                  <NavIcon size={17} />
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className={styles.footer}>Version 1.0 — MVP</div>
      </aside>
    </>
  );
}
