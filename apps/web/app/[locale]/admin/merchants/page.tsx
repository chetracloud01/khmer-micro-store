"use client";

import { adminCan, adminExtendSchema, adminPlanChangeSchema, toFieldErrors, type FormErrorCode, type SubscriptionStatus } from "@khmio/shared";
import { BottomSheet, Button, Card, cn, Input, SearchInput, Select } from "@khmio/ui";
import { ChevronRight, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useFormErrorText } from "@/components/form-ui";
import type { AdminMerchantDetail, AdminMerchantRow } from "@/lib/admin-api";
import { api, ApiError } from "@/lib/api";
import { useAdminMe } from "../admin-context";
import { LoadState, PageHeader, Pill, STATUS_STYLES, useDateText } from "../admin-ui";
import { useAuditText } from "../audit-text";

const STATUS_FILTERS: ("all" | SubscriptionStatus)[] = ["all", "trialing", "active", "grace", "paused"];

export default function MerchantsPage() {
  // useSearchParams (the ?status= filter) needs a Suspense boundary for Next's static build.
  return (
    <Suspense fallback={<LoadState failed={false} onRetry={() => undefined} />}>
      <Merchants />
    </Suspense>
  );
}

// Every shop on the platform (design/screens.md A2). Open one to see its
// details and trail, and to extend its period or change its plan.
function Merchants() {
  const t = useTranslations("AdminApp");
  const tAdmin = useTranslations("Admin");
  const tPlans = useTranslations("Plans");
  const tType = useTranslations("BusinessType");
  const { date } = useDateText();
  const initialStatus = useSearchParams().get("status");
  const [rows, setRows] = useState<AdminMerchantRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_FILTERS)[number]>(STATUS_FILTERS.find((value) => value === initialStatus) ?? "all");
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    api<AdminMerchantRow[]>("/admin/merchants").then(setRows, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  if (!rows) return <LoadState failed={failed} onRetry={load} />;
  const words = query.trim().toLowerCase().replace(/^@/, "");
  const shown = rows.filter(
    (row) =>
      (status === "all" || row.status === status) &&
      (!words || `${row.name} ${row.slug} ${row.owner?.name ?? ""} ${row.owner?.telegramUsername ?? ""}`.toLowerCase().includes(words)),
  );
  const statusLabel = (value: SubscriptionStatus | null) => (value ? t(`status_${value}`) : "—");

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("merchantsTitle")} description={t("merchantsDescription")} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="md:w-80">
          <SearchInput value={query} onChange={(e) => setQuery(e.target.value)} onClear={() => setQuery("")} clearLabel={tAdmin("close")} placeholder={tAdmin("searchPlaceholder")} aria-label={tAdmin("searchPlaceholder")} />
        </div>
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {STATUS_FILTERS.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => setStatus(value)}
              className={cn(
                "min-h-touch shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium",
                status === value ? "border-brand bg-brand text-on-brand" : "border-border bg-bg text-muted hover:text-fg",
              )}
            >
              {value === "all" ? tAdmin("filterAll") : statusLabel(value)} ({value === "all" ? rows.length : rows.filter((row) => row.status === value).length})
            </button>
          ))}
        </div>
      </div>

      {shown.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">{tAdmin("noMatches")}</Card>
      ) : (
        <>
          {/* Laptop: a table. */}
          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">{tAdmin("colStore")}</th>
                  <th className="px-4 py-3 font-medium">{tAdmin("fieldOwner")}</th>
                  <th className="px-4 py-3 font-medium">{tAdmin("colPlan")}</th>
                  <th className="px-4 py-3 font-medium">{tAdmin("colStatus")}</th>
                  <th className="px-4 py-3 font-medium">{t("colEnds")}</th>
                  <th className="px-4 py-3 text-right font-medium">{tAdmin("colProducts")}</th>
                  <th className="px-4 py-3 text-right font-medium">{t("colOrders")}</th>
                  <th className="px-4 py-3 font-medium">{tAdmin("colJoined")}</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((row) => (
                  <tr key={row.id} onClick={() => setOpenId(row.id)} className="cursor-pointer border-b border-border last:border-0 hover:bg-border/10">
                    <td className="px-4 py-3">
                      <button type="button" className="text-left font-medium hover:underline" onClick={() => setOpenId(row.id)}>
                        {row.name}
                      </button>
                      <span className="block text-xs text-muted">
                        /s/{row.slug} · {tType(row.businessType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {row.owner?.name ?? "—"}
                      {row.owner?.telegramUsername && <span className="block text-xs text-muted">@{row.owner.telegramUsername}</span>}
                    </td>
                    <td className="px-4 py-3">{row.plan ? tPlans(row.plan) : "—"}</td>
                    <td className="px-4 py-3">{row.status && <Pill className={STATUS_STYLES[row.status]}>{statusLabel(row.status)}</Pill>}</td>
                    <td className="px-4 py-3 tabular-nums">{date(row.endsAt)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.products}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.orders}</td>
                    <td className="px-4 py-3 tabular-nums">{date(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          {/* Phone: cards. */}
          <ul className="flex flex-col gap-3 md:hidden">
            {shown.map((row) => (
              <li key={row.id}>
                <button type="button" onClick={() => setOpenId(row.id)} className="w-full text-left">
                  <Card className="flex items-center gap-3 p-4">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{row.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {row.owner?.name ?? "—"} · {row.plan ? tPlans(row.plan) : "—"} · {t("ordersCount", { count: row.orders })}
                      </span>
                    </span>
                    {row.status && <Pill className={STATUS_STYLES[row.status]}>{statusLabel(row.status)}</Pill>}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                  </Card>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {openId && (
        <MerchantPanel
          storeId={openId}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

function MerchantPanel({ storeId, onClose, onChanged }: { storeId: string; onClose: () => void; onChanged: () => void }) {
  const t = useTranslations("AdminApp");
  const tAdmin = useTranslations("Admin");
  const tPlans = useTranslations("Plans");
  const tType = useTranslations("BusinessType");
  const locale = useLocale();
  const errorText = useFormErrorText();
  const me = useAdminMe();
  const { date, dateTime } = useDateText();
  const { describe } = useAuditText();
  // Owner and Support may extend and change plans; Finance only looks (packages/shared admin-roles.ts).
  const canManage = adminCan(me.role, "merchants_manage");
  const [detail, setDetail] = useState<AdminMerchantDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const [days, setDays] = useState("14");
  const [plan, setPlan] = useState<"basic" | "pro" | "advance">("basic");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Partial<Record<string, FormErrorCode>>>({});
  const [busy, setBusy] = useState<"extend" | "plan" | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "danger"; text: string } | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    api<AdminMerchantDetail>(`/admin/merchants/${storeId}`).then(setDetail, () => setFailed(true));
  }, [storeId]);
  useEffect(load, [load]);

  async function run(kind: "extend" | "plan") {
    const body = kind === "extend" ? { days: /^\d+$/.test(days.trim()) ? Number(days) : Number.NaN, note } : { plan, note };
    const parsed = kind === "extend" ? adminExtendSchema.safeParse(body) : adminPlanChangeSchema.safeParse(body);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setBusy(kind);
    setMessage(null);
    try {
      await api(`/admin/merchants/${storeId}/${kind === "extend" ? "extend" : "plan"}`, { method: "POST", body: parsed.data });
      setMessage({ tone: "success", text: kind === "extend" ? t("extendDone", { count: Number(days) }) : t("planDone", { plan: tPlans(plan) }) });
      setNote("");
      load();
      onChanged();
    } catch (failure) {
      setMessage({ tone: "danger", text: failure instanceof ApiError && failure.code === "action_not_allowed" ? t("changedMeanwhile") : t("saveFailed") });
    } finally {
      setBusy(null);
    }
  }

  const sub = detail?.subscription;
  return (
    <BottomSheet open onClose={onClose} closeLabel={tAdmin("close")} title={detail?.name ?? "…"} placement="center">
      {!detail ? (
        <LoadState failed={failed} onRetry={load} />
      ) : (
        <div className="flex flex-col gap-5">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted">{t("fieldLink")}</dt>
            <dd>
              <Link href={`/${locale}/s/${detail.slug}`} target="_blank" className="inline-flex items-center gap-1 text-brand">
                /s/{detail.slug}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </dd>
            <dt className="text-muted">{t("fieldType")}</dt>
            <dd>{tType(detail.businessType)}</dd>
            <dt className="text-muted">{tAdmin("fieldOwner")}</dt>
            <dd>
              {detail.members.find((member) => member.role === "owner")?.name ?? "—"}
              {detail.members.find((member) => member.role === "owner")?.telegramUsername && (
                <span className="block text-xs text-muted">@{detail.members.find((member) => member.role === "owner")?.telegramUsername}</span>
              )}
            </dd>
            <dt className="text-muted">{tAdmin("colPlan")}</dt>
            <dd className="flex flex-wrap items-center gap-2">
              {sub ? tPlans(sub.plan) : "—"}
              {sub && <Pill className={STATUS_STYLES[sub.status]}>{t(`status_${sub.status}`)}</Pill>}
            </dd>
            <dt className="text-muted">{t("colEnds")}</dt>
            <dd className="tabular-nums">{date(sub?.endsAt ?? null)}</dd>
            <dt className="text-muted">{t("fieldActivity")}</dt>
            <dd>
              {tAdmin("productCount", { count: detail.products })} · {t("ordersCount", { count: detail.orders })}
              <span className="block text-xs text-muted">
                {t("lastOrder")}: {date(detail.lastOrderAt)}
              </span>
            </dd>
            <dt className="text-muted">{tAdmin("colJoined")}</dt>
            <dd className="tabular-nums">{date(detail.createdAt)}</dd>
          </dl>

          {message && (
            <p role="status" className={cn("rounded-DEFAULT p-3 text-sm", message.tone === "success" ? "bg-success/10 text-success" : "bg-danger/10 text-danger")}>
              {message.text}
            </p>
          )}

          {canManage && sub && (
            <div className="flex flex-col gap-4 rounded-2xl border border-border p-4">
              <p className="text-sm text-muted">{tAdmin("overrideNote")}</p>
              <Input
                label={t("noteLabel")}
                placeholder={t("notePlaceholder")}
                maxLength={200}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setErrors((previous) => ({ ...previous, note: undefined }));
                }}
                error={errorText(errors.note)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Input
                    label={t("extendDays")}
                    inputMode="numeric"
                    value={days}
                    onChange={(e) => {
                      setDays(e.target.value);
                      setErrors((previous) => ({ ...previous, days: undefined }));
                    }}
                    error={errorText(errors.days)}
                  />
                  <p className="text-xs text-muted">{sub.status === "paused" || sub.status === "grace" ? t("extendReopens") : t("extendAdds")}</p>
                  <Button variant="primary" loading={busy === "extend"} disabled={busy !== null} onClick={() => void run("extend")}>
                    {tAdmin("extendTitle")}
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  <Select
                    label={tAdmin("changePlan")}
                    value={plan}
                    onChange={(e) => setPlan(e.target.value === "pro" ? "pro" : e.target.value === "advance" ? "advance" : "basic")}
                    options={(["basic", "pro", "advance"] as const).map((value) => ({ value, label: tPlans(value) }))}
                  />
                  <p className="text-xs text-muted">{t("planHint")}</p>
                  <Button variant="secondary" loading={busy === "plan"} disabled={busy !== null || sub.plan === plan} onClick={() => void run("plan")}>
                    {tAdmin("applyPlan")}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{t("trail")}</h3>
            {detail.audit.length === 0 ? (
              <p className="text-sm text-muted">{tAdmin("noActivity")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border text-sm">
                {detail.audit.map((entry) => (
                  <li key={entry.id} className="flex flex-wrap justify-between gap-x-3 py-2">
                    <span>
                      {describe(entry)}
                      {typeof entry.after?.note === "string" && <span className="block text-xs text-muted">“{entry.after.note}”</span>}
                    </span>
                    <span className="text-xs text-muted tabular-nums">{dateTime(entry.at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}
