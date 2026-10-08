import Link from "next/link";
import { CalendarIcon, DumbbellIcon } from "@/components/ui/icons";
import { getInitials } from "@/lib/utils/format";
import LogoutButton from "./LogoutButton";
import SubscriptionBadge from "./SubscriptionBadge";
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
export default function Header({ todayLabel, admin, subscription }) {
  const [first = "", last = ""] = admin.name.split(" ");
  const gymName = admin.gymName || "Gym";

  return (
    <header className={styles.header}>
      {/* On a phone this is the gym's name. Desktop shows it in the sidebar. */}
      <Link href="/dashboard" className={styles.brand} aria-label={`${gymName} - go to the dashboard`}>
        <span className={styles.logo}>
          <DumbbellIcon size={16} />
        </span>
        <span className={styles.brandName}>{gymName}</span>
      </Link>

      <span className={styles.date}>
        <CalendarIcon size={15} />
        {todayLabel}
      </span>

      <div className={styles.spacer} />

      <span className={styles.admin} title={admin.gymName ? `${admin.name} · ${admin.gymName}` : admin.email}>
        {subscription ? (
          <SubscriptionBadge gymName={admin.gymName || "Gym"} subscription={subscription} />
        ) : (
          <span className={styles.avatar} aria-hidden="true">
            {getInitials(first, last)}
          </span>
        )}
        <span className={styles.adminName}>{admin.name}</span>
      </span>

      <LogoutButton />
    </header>
  );
}
