import { APP_FULL_NAME } from "@/lib/config";
import { CalendarIcon, MenuIcon } from "@/components/ui/icons";
import styles from "./Header.module.css";

/**
 * The top bar. Presentational only - it renders what it is given.
 *
 * `todayLabel` arrives already formatted from the server, rather than being
 * worked out here. The gym's date is decided in one place (lib/utils/dates.js,
 * on the server) so the header can never show a different day from the
 * membership calculations underneath it.
 *
 * It is part of the client bundle because DashboardLayout, which owns the
 * sidebar's open state, renders it and hands it `onMenuClick`.
 */
export default function Header({ todayLabel, onMenuClick }) {
  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.menuButton}
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <MenuIcon size={18} />
      </button>

      <span className={styles.title}>{APP_FULL_NAME}</span>

      <div className={styles.spacer} />

      <span className={styles.date}>
        <CalendarIcon size={15} />
        {todayLabel}
      </span>
    </header>
  );
}
