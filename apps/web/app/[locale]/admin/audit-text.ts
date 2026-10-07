"use client";

import { useTranslations } from "next-intl";
import type { AdminAuditEntry } from "@/lib/admin-api";

/** Known actions get a sentence ("Extended by 14 days"); others show their code, so nothing is ever hidden. */
const KNOWN = new Set([
  "subscription.extended",
  "subscription.plan_changed",
  "platform.settings_saved",
  "admin.login",
  "admin.login_backup_code",
  "admin.two_step_set_up",
  "admin.code_wrong",
  "admin.login_locked",
  "admin.owner_added",
  "admin.owner_reset",
  "store.details_saved",
  "store.settings_saved",
  "store.delivery_saved",
  "store.telegram_group_linked",
  "store.telegram_group_unlinked",
  "store.created",
  "merchant.signed_up",
  "backup.started",
  "backup.restore_test_passed",
]);

export function useAuditText() {
  const t = useTranslations("AdminApp");
  const tPlans = useTranslations("Plans");
  function describe(entry: Pick<AdminAuditEntry, "action" | "after">): string {
    const after = entry.after ?? {};
    if (entry.action === "subscription.extended") return t("audit_extended", { count: Number(after.days ?? 0) });
    if (entry.action === "subscription.plan_changed") return t("audit_plan", { plan: typeof after.plan === "string" ? tPlans(after.plan) : "" });
    if (entry.action.startsWith("order.")) return t("audit_order", { action: entry.action.slice(6) });
    if (KNOWN.has(entry.action)) return t(`audit_${entry.action.replace(".", "_")}`);
    return entry.action;
  }
  return { describe };
}
