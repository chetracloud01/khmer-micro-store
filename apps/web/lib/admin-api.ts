import type { AdminRole, BackupRunView, PlatformHealth, BusinessType, PlanId, PlatformProductId, PlatformSettingsSave, SubscriptionStatus, WaitlistBusinessType } from "@khmio/shared";

// What the admin API (apps/api admin/*) answers. Calls go through lib/api.ts
// api(); the admin cookie is set by the API for its /admin routes only.

/** GET /admin/auth/me. */
export type AdminMe = { stage: "active"; name: string; role: AdminRole } | { stage: "pending_2fa"; name: string; enrolled: boolean };

export interface AdminOverview {
  shops: number;
  newThisWeek: number;
  paused: number;
  trialsEndingSoon: number;
  ordersToday: number;
  waitingOrders: number;
  messagesGaveUp: number;
  health: PlatformHealth;
}

export interface AdminMerchantRow {
  id: string;
  slug: string;
  name: string;
  businessType: BusinessType;
  createdAt: string;
  owner: { name: string; telegramUsername: string | null } | null;
  plan: PlanId | null;
  status: SubscriptionStatus | null;
  endsAt: string | null;
  products: number;
  orders: number;
}

export interface AdminAuditEntry {
  id: string;
  at: string;
  actorType: "admin" | "merchant" | "system";
  actorName: string | null;
  storeId: string | null;
  storeName: string | null;
  action: string;
  entity: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
}

export interface AdminMerchantDetail {
  id: string;
  slug: string;
  name: string;
  businessType: BusinessType;
  phone: string;
  area: "phnom_penh" | "province";
  createdAt: string;
  deliveryConfiguredAt: string | null;
  subscription: { plan: PlanId; status: SubscriptionStatus; trialEndsAt: string | null; currentPeriodStart: string; currentPeriodEnd: string | null; endsAt: string | null } | null;
  members: { role: "owner" | "staff"; name: string; telegramUsername: string | null }[];
  products: number;
  orders: number;
  lastOrderAt: string | null;
  audit: Pick<AdminAuditEntry, "id" | "at" | "actorType" | "action" | "after">[];
}

export type AdminSettings = PlatformSettingsSave;

/** GET /admin/badges: the menu's red counts. */
export interface AdminBadges {
  trialsEnding: number;
  backupsStale: number;
}

/** GET /admin/backups (A13): one page of runs, newest first, the newest good one, and the last restore test. */
export interface AdminBackups {
  runs: BackupRunView[];
  latestDone: BackupRunView | null;
  restoreTestPassedAt: string | null;
  more: boolean;
}

/** GET /admin/waitlist: sign-ups per product, and one page of sign-ups, newest first. */
export interface AdminWaitlist {
  counts: Partial<Record<PlatformProductId, number>>;
  signups: { id: string; product: PlatformProductId; name: string; phone: string; businessType: WaitlistBusinessType; createdAt: string }[];
  more: boolean;
}
