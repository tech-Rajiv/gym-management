import {
  DashboardIcon,
  MembersIcon,
  CardIcon,
  HistoryIcon,
} from "@/components/ui/icons";

/**
 * The navigation's contents.
 *
 * Adding a module to the navigation means adding one entry here - the desktop
 * Sidebar and the mobile BottomNav both render whatever is in this list and
 * need no change. `short` is the label under the icon in the bottom bar,
 * where space is tight.
 *
 * The future modules are listed below, commented out, so the intended shape of
 * the finished application is visible. Uncomment an entry once its route
 * actually exists.
 */
export const NAV_SECTIONS = [
  {
    label: null, // The first group needs no heading.
    items: [
      { href: "/dashboard", label: "Dashboard", short: "Home", icon: DashboardIcon },
      { href: "/members", label: "Members", short: "Members", icon: MembersIcon },
      { href: "/payments", label: "Payments", short: "Payments", icon: CardIcon },
      { href: "/history", label: "History Logs", short: "History", icon: HistoryIcon },

      // Coming later:
      // { href: "/attendance", label: "Attendance", icon: CalendarIcon },
      // { href: "/plans", label: "Membership Plans", icon: TagIcon },
      // { href: "/trainers", label: "Trainers", icon: WhistleIcon },
      // { href: "/expenses", label: "Expenses", icon: WalletIcon },
      // { href: "/reports", label: "Reports", icon: ChartIcon },
      // { href: "/settings", label: "Settings", icon: GearIcon },
    ],
  },
];

/** Every item, flattened - for the bottom bar, which has no section headings. */
export const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

/**
 * A link is active on its own page and on anything beneath it, so
 * /members/12/edit still highlights Members.
 */
export function isNavActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
