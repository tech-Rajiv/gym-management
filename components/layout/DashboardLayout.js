"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import styles from "./DashboardLayout.module.css";

/**
 * The application shell: sidebar on the left, header and page content on the
 * right.
 *
 * This is the one Client Component in the layout, and it exists for a single
 * reason - something has to remember whether the mobile sidebar is open.
 *
 * `children` is the page itself, rendered on the server and passed through as
 * a slot. Wrapping server-rendered content in a Client Component this way
 * keeps the pages, and their database queries, on the server.
 */
export default function DashboardLayout({ todayLabel, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.shell}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={styles.main}>
        <Header todayLabel={todayLabel} onMenuClick={() => setSidebarOpen(true)} />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
