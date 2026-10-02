"use client";

import { Card } from "@khmer-micro-store/ui";
import { AlertTriangle, CalendarClock, ChevronRight, PauseCircle, ShoppingBag, Sparkles, Store } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { AdminAuditEntry, AdminOverview } from "@/lib/admin-api";
import { api } from "@/lib/api";
import { LoadState, PageHeader, StatCard, useDateText } from "./admin-ui";
import { useAuditText } from "./audit-text";

// The admin overview (roadmap step 7): the numbers that say whether the
// platform is healthy, what needs a person, and the latest admin changes.
export default function AdminOverviewPage() {
  const t = useTranslations("AdminApp");
  const tAdmin = useTranslations("Admin");
  const locale = useLocale();
  const { dateTime } = useDateText();
  const { describe } = useAuditText();
  const [data, setData] = useState<{ overview: AdminOverview; recent: AdminAuditEntry[] } | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    Promise.all([api<AdminOverview>("/admin/overview"), api<{ entries: AdminAuditEntry[] }>("/admin/audit-log")])
      .then(([overview, audit]) => setData({ overview, recent: audit.entries.filter((entry) => entry.actorType === "admin").slice(0, 8) }))
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  if (!data) return <LoadState failed={failed} onRetry={load} />;
  const { overview, recent } = data;
  const attention = [
    overview.paused > 0 && { text: t("attentionPaused", { count: overview.paused }), href: `/${locale}/admin/merchants?status=paused` },
    overview.trialsEndingSoon > 0 && { text: t("attentionTrials", { count: overview.trialsEndingSoon }), href: `/${locale}/admin/merchants` },
    overview.messagesGaveUp > 0 && { text: t("attentionMessages", { count: overview.messagesGaveUp }), href: `/${locale}/admin/audit-log` },
  ].filter((item): item is { text: string; href: string } => !!item);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={tAdmin("overviewTitle")} description={t("overviewDescription")} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Store} label={t("statShops")} value={String(overview.shops)} />
        <StatCard icon={Sparkles} label={t("statNewThisWeek")} value={String(overview.newThisWeek)} />
        <StatCard icon={ShoppingBag} label={t("statOrdersToday")} value={String(overview.ordersToday)} />
        <StatCard icon={ShoppingBag} label={t("statWaitingOrders")} value={String(overview.waitingOrders)} tone="warning" />
        <StatCard icon={CalendarClock} label={t("statTrialsEnding")} value={String(overview.trialsEndingSoon)} tone="warning" />
        <StatCard icon={PauseCircle} label={t("statPaused")} value={String(overview.paused)} tone={overview.paused ? "danger" : "muted"} />
      </div>

      <Card className="flex flex-col gap-2 p-4">
        <h2 className="font-semibold">{tAdmin("attentionTitle")}</h2>
        {attention.length === 0 ? (
          <p className="text-sm text-muted">{tAdmin("attentionNone")}</p>
        ) : (
          <ul className="flex flex-col">
            {attention.map((item) => (
              <li key={item.text}>
                <Link href={item.href} className="flex min-h-touch items-center gap-3 rounded-DEFAULT px-2 text-sm hover:bg-border/10">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                  <span className="flex-1">{item.text}</span>
                  <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold">{tAdmin("activityTitle")}</h2>
          <Link href={`/${locale}/admin/audit-log`} className="flex min-h-touch items-center text-sm font-medium text-brand">
            {tAdmin("viewAll")}
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">{tAdmin("noActivity")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {recent.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 text-sm">
                <span className="min-w-0">
                  <span className="font-medium">{entry.actorName ?? "—"}</span> · {describe(entry)}
                  {entry.storeName && <span className="text-muted"> · {entry.storeName}</span>}
                </span>
                <span className="text-xs text-muted tabular-nums">{dateTime(entry.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
