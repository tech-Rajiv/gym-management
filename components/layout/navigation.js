import {
  DashboardIcon,
  MembersIcon,
} from "@/components/ui/icons";

/**
 * The sidebar's contents.
 *
 * Adding a module to the navigation means adding one entry here - the Sidebar
 * component renders whatever is in this list and needs no change.
 *
 * The future modules are listed below, commented out, so the intended shape of
 * the finished application is visible. Uncomment an entry once its route
 * actually exists.
 */
export const NAV_SECTIONS = [
  {
    label: null, // The first group needs no heading.
    items: [
      { href: "/dashboard", label: "Dashboard", icon: DashboardIcon },
      { href: "/members", label: "Members", icon: MembersIcon },

      // Coming later:
      // { href: "/attendance", label: "Attendance", icon: CalendarIcon },
      // { href: "/plans", label: "Membership Plans", icon: TagIcon },
      // { href: "/payments", label: "Payments", icon: CardIcon },
      // { href: "/trainers", label: "Trainers", icon: WhistleIcon },
      // { href: "/expenses", label: "Expenses", icon: WalletIcon },
      // { href: "/reports", label: "Reports", icon: ChartIcon },
      // { href: "/settings", label: "Settings", icon: GearIcon },
    ],
  },
];
