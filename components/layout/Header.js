import Brand from "@/components/ui/Brand";
import { CalendarIcon } from "@/components/ui/icons";
import { getInitials } from "@/lib/utils/format";
import LogoutButton from "./LogoutButton";
import styles from "./Header.module.css";

/**
 * The top bar: who is signed in, today's date, and the logout button.
 *
 * `todayLabel` arrives already formatted from the server, rather than being
 * worked out here. The gym's date is decided in one place (lib/utils/dates.js,
 * on the server) so the header can never show a different day from the
 * membership calculations underneath it.
 *
 * On phones the brand appears here, since the sidebar that carries it on
 * desktop is hidden.
 */
export default function Header({ todayLabel, admin }) {
  const [first = "", last = ""] = admin.name.split(" ");

  return (
    <header className={styles.header}>
      <span className={styles.brand}>
        <Brand size="sm" />
      </span>

      <span className={styles.date}>
        <CalendarIcon size={15} />
        {todayLabel}
      </span>

      <div className={styles.spacer} />

      <span className={styles.admin} title={admin.email}>
        <span className={styles.avatar} aria-hidden="true">
          {getInitials(first, last)}
        </span>
        <span className={styles.adminName}>{admin.name}</span>
      </span>

      <LogoutButton />
    </header>
  );
}
