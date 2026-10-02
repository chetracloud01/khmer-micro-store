"use client";

import { Button, Card, cn } from "@khmer-micro-store/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { AdminAuditEntry } from "@/lib/admin-api";
import { api } from "@/lib/api";
import { LoadState, PageHeader, Pill, useDateText } from "../admin-ui";
import { useAuditText } from "../audit-text";

const FILTERS = [
  { value: "", key: "filterEverything" },
  { value: "subscription", key: "filterSubscriptions" },
  { value: "admin", key: "filterLogins" },
  { value: "platform", key: "filterSettings" },
  { value: "order", key: "filterOrders" },
  { value: "store", key: "filterShops" },
] as const;

const ACTOR_TONE = { admin: "bg-brand/10 text-brand", merchant: "bg-border/30 text-muted", system: "bg-warning/10 text-warning" } as const;

// Every recorded change, newest first (design/screens.md A5). Read-only: the
// table can't be edited, by anyone.
export default function AuditLogPage() {
  const t = useTranslations("AdminApp");
  const tAdmin = useTranslations("Admin");
  const { dateTime } = useDateText();
  const { describe } = useAuditText();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("");
  const [entries, setEntries] = useState<AdminAuditEntry[] | null>(null);
  const [more, setMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback((action: string, before?: string) => {
    setFailed(false);
    const query = new URLSearchParams({ ...(action ? { action } : {}), ...(before ? { before } : {}) }).toString();
    return api<{ entries: AdminAuditEntry[]; more: boolean }>(`/admin/audit-log${query ? `?${query}` : ""}`).then(
      (page) => {
        setEntries((previous) => (before && previous ? [...previous, ...page.entries] : page.entries));
        setMore(page.more);
      },
      () => setFailed(true),
    );
  }, []);
  useEffect(() => {
    setEntries(null);
    void load(filter);
  }, [filter, load]);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("auditTitle")} description={tAdmin("auditDescription")} />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {FILTERS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "min-h-touch shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium",
              filter === option.value ? "border-brand bg-brand text-on-brand" : "border-border bg-bg text-muted hover:text-fg",
            )}
          >
            {t(option.key)}
          </button>
        ))}
      </div>

      {!entries ? (
        <LoadState failed={failed} onRetry={() => void load(filter)} />
      ) : entries.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">{tAdmin("noActivity")}</Card>
      ) : (
        <Card className="p-0">
          <ul className="flex flex-col divide-y divide-border">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 p-4 text-sm md:flex-row md:items-baseline md:gap-4">
                <span className="w-32 shrink-0 text-xs text-muted tabular-nums">{dateTime(entry.at)}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Pill className={ACTOR_TONE[entry.actorType]}>{t(`actor_${entry.actorType}`)}</Pill>
                    <span className="font-medium">{entry.actorName ?? "—"}</span>
                    <span>{describe(entry)}</span>
                  </span>
                  {(entry.storeName || typeof entry.after?.note === "string") && (
                    <span className="text-xs text-muted">
                      {entry.storeName}
                      {entry.storeName && typeof entry.after?.note === "string" ? " · " : ""}
                      {typeof entry.after?.note === "string" ? `“${entry.after.note}”` : ""}
                    </span>
                  )}
                  {entry.before && entry.after && <Change before={entry.before} after={entry.after} />}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {entries && more && (
        <Button
          variant="secondary"
          className="self-center"
          loading={loadingMore}
          onClick={() => {
            setLoadingMore(true);
            void load(filter, entries[entries.length - 1]?.at).finally(() => setLoadingMore(false));
          }}
        >
          {t("older")}
        </Button>
      )}
    </div>
  );
}

/** "status: paused → trialing": only the fields that changed. */
function Change({ before, after }: { before: Record<string, unknown>; after: Record<string, unknown> }) {
  const changed = Object.keys(before).filter((key) => key !== "note" && JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  if (changed.length === 0) return null;
  const show = (value: unknown) => (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) ? value.slice(0, 10) : value === null || value === undefined ? "—" : String(value));
  return (
    <span className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted">
      {changed.map((key) => (
        <span key={key}>
          {key}: {show(before[key])} → {show(after[key])}
        </span>
      ))}
    </span>
  );
}
