"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS, isNavActive } from "./navigation";
import Brand from "@/components/ui/Brand";
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
      <div className={styles.brand}>
        <Brand tagline="Management" />
      </div>

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
