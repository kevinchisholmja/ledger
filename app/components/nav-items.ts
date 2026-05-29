import {
  LayoutDashboard,
  CalendarRange,
  Target,
  CheckCircle2,
  ArrowLeftRight,
  BookText,
  Wallet,
  PieChart,
  Tags,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", shortLabel: "Home", icon: LayoutDashboard },
  { href: "/plan", label: "Plan", icon: CalendarRange },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/review", label: "Review", icon: CheckCircle2 },
  { href: "/transactions", label: "Transactions", shortLabel: "Txns", icon: ArrowLeftRight },
  { href: "/register", label: "Register", icon: BookText },
  { href: "/accounts", label: "All Accounts", icon: Wallet },
  { href: "/budgets", label: "Budgets", icon: PieChart },
  { href: "/categories", label: "Categories", icon: Tags },
];

// Primary items shown in the mobile bottom tab bar; the rest go under "More".
export const MOBILE_PRIMARY = ["/", "/review", "/transactions", "/plan"];
