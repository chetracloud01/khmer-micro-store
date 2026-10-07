import {
  AlertTriangle,
  CreditCard,
  DatabaseBackup,
  Globe,
  Images,
  KeyRound,
  LayoutDashboard,
  Layers,
  Megaphone,
  ReceiptText,
  Repeat,
  ScrollText,
  Settings,
  Store,
  UserCog,
  type LucideIcon,
} from "lucide-react";

// The one place the admin menu is defined. Adding an admin page = one entry
// here (plus the page itself, and its "AdminNav" label in messages/*.json).

export type AdminBadge = "kycPending" | "invoicesOverdue" | "failedChecks";

export interface AdminNavItem {
  /** Also the message key under "AdminNav" for its label and description. */
  key: string;
  /** URL segment under /mockup/admin — "" is the overview. */
  segment: string;
  icon: LucideIcon;
  badge?: AdminBadge;
  /** Shown as a standard "coming soon" page until built. */
  comingSoon?: boolean;
}

export interface AdminNavGroup {
  /** Message key under "AdminNav" for the group heading. */
  key: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  { key: "groupMain", items: [{ key: "overview", segment: "", icon: LayoutDashboard }] },
  {
    key: "groupMerchants",
    items: [
      { key: "merchants", segment: "merchants", icon: Store },
      { key: "kyc", segment: "kyc", icon: KeyRound, badge: "kycPending" },
    ],
  },
  {
    key: "groupRevenue",
    items: [
      { key: "subscriptions", segment: "subscriptions", icon: Repeat },
      { key: "invoices", segment: "invoices", icon: ReceiptText, badge: "invoicesOverdue" },
      { key: "plans", segment: "plans", icon: Layers },
    ],
  },
  {
    key: "groupPayments",
    items: [
      { key: "payments", segment: "payments", icon: CreditCard },
      { key: "failedChecks", segment: "failed-checks", icon: AlertTriangle, badge: "failedChecks" },
    ],
  },
  {
    key: "groupWebsite",
    items: [
      { key: "website", segment: "website", icon: Globe },
      { key: "promotions", segment: "promotions", icon: Megaphone },
      { key: "pictures", segment: "pictures", icon: Images },
    ],
  },
  {
    key: "groupSystem",
    items: [
      { key: "auditLog", segment: "audit-log", icon: ScrollText },
      { key: "backups", segment: "backups", icon: DatabaseBackup },
      { key: "admins", segment: "admins", icon: UserCog },
      { key: "settings", segment: "settings", icon: Settings },
    ],
  },
];

export const ADMIN_NAV_ITEMS: AdminNavItem[] = ADMIN_NAV.flatMap((group) => group.items);

/** The menu item (and its group) for the current URL, matched on the first segment after /admin. */
export function findActiveNav(pathname: string, locale: string): { group: AdminNavGroup; item: AdminNavItem } | null {
  const base = `/${locale}/mockup/admin`;
  const rest = pathname.startsWith(base) ? pathname.slice(base.length).replace(/^\//, "") : "";
  const segment = rest.split("/")[0] ?? "";
  for (const group of ADMIN_NAV) {
    const item = group.items.find((candidate) => candidate.segment === segment);
    if (item) return { group, item };
  }
  return null;
}

export function adminHref(locale: string, segment: string): string {
  return segment ? `/${locale}/mockup/admin/${segment}` : `/${locale}/mockup/admin`;
}
