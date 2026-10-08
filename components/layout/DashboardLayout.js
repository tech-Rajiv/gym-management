import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import Header from "./Header";
import styles from "./DashboardLayout.module.css";

/**
 * The application shell: sidebar on the left on desktop, a tab bar along the
 * bottom on phones and tablets, and the header above the page.
 *
 * A Server Component. Only the pieces that need the browser - the two
 * navigations (for the current path) and the logout button - are Client
 * Components, so the pages passed in as `children` stay on the server.
 */
export default function DashboardLayout({ todayLabel, admin, subscription, children }) {
  return (
    <div className={styles.shell}>
      <Sidebar gymName={admin.gymName} />

      <div className={styles.main}>
        <Header todayLabel={todayLabel} admin={admin} subscription={subscription} />
        <main className={styles.content}>{children}</main>
      </div>

      <BottomNav />
    </div>
  );
}
