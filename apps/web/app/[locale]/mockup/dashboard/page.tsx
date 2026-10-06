"use client";

import { formatUsd, isCashOrder, needsSellerAction, type Currency } from "@khmio/shared";
import { Card, SegmentedControl, Skeleton } from "@khmio/ui";
import { Banknote, CheckCircle2, ChevronRight, Inbox, Wallet, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { mockDailyStats } from "@/mock/mock-data";
import type { OrderRecord } from "@/mock/mock-orders";
import { useMerchantProfile } from "../merchant-profile-context";
import { OrderNextButton, sellerOrderHref } from "../order-next-button";
import { formatMoney, OrderStatusPill, useOrderText } from "@/components/order-ui";
import { useOrders } from "../orders-context";
import { useStoreSettings } from "../store-settings-context";
import { SetupChecklist } from "./setup-checklist";

type RangeFilter = "today" | "7d" | "30d";

const RANGE_DAYS: Record<RangeFilter, number> = { today: 1, "7d": 7, "30d": 30 };
/** The home page shows the first few; the orders list has the rest. */
const MAX_ACTION_ROWS = 5;

/**
 * Orders are in dollars or in riel, whichever the buyer chose. Adding them up
 * keeps the two apart — a riel order is never turned into dollars at today's
 * rate (docs/blueprint.md "Multi-currency pricing and totals").
 */
function sumByCurrency(orders: OrderRecord[]): Record<Currency, number> {
  const sums: Record<Currency, number> = { USD: 0, KHR: 0 };
  for (const order of orders) sums[order.currency] += order.total;
  return sums;
}

export default function DashboardMockupPage() {
  const { hydrated: ordersReady } = useOrders();
  const { hydrated: profileReady } = useMerchantProfile();
  const { hydrated: settingsReady } = useStoreSettings();
  return ordersReady && profileReady && settingsReady ? <DashboardHome /> : <DashboardSkeleton />;
}

function DashboardSkeleton() {
  const t = useTranslations("Dashboard");
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5 p-4 md:p-6" aria-busy="true">
      <span className="sr-only" role="status">
        {t("loading")}
      </span>
      <Skeleton className="h-7 w-32" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Skeleton className="col-span-2 h-24 sm:col-span-1" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, className, children }: { icon: LucideIcon; label: string; className?: string; children: ReactNode }) {
  return (
    <Card className={`flex flex-col gap-1 p-4 ${className ?? ""}`}>
      <span className="flex items-center gap-2 text-sm text-muted">
        <Icon className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
        {label}
      </span>
      {children}
    </Card>
  );
}

// Seller's home (design/screens.md S3): what needs doing now comes first, the
// numbers and the chart after. Everything except the chart reads the real orders.
function DashboardHome() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const profile = useMerchantProfile();
  const { orders } = useOrders();
  const { settings } = useStoreSettings();
  const { placeLabel, timeAgo } = useOrderText();
  const [range, setRange] = useState<RangeFilter>("7d");

  const needingAction = orders.filter((order) => needsSellerAction(order.status));
  const today = new Date().toDateString();
  const salesToday = sumByCurrency(
    orders.filter(
      (order) =>
        new Date(order.placedAtIso).toDateString() === today && order.status !== "cancelled" && order.status !== "awaiting_payment",
    ),
  );
  // Cash the seller hasn't got in hand yet: with the buyer, or with a driver on the way back.
  const cashToCollect = sumByCurrency(
    orders.filter((order) => isCashOrder(order) && order.status !== "completed" && order.status !== "cancelled"),
  );

  /** Both currencies when both have money in them; one zero in the shop's own currency when neither does. */
  function money(sums: Record<Currency, number>) {
    const shown = (["USD", "KHR"] as const).filter((currency) => sums[currency] > 0);
    if (shown.length === 0) return <span className="text-2xl font-bold tabular-nums">{formatMoney(0, settings.defaultCurrency)}</span>;
    return shown.map((currency, index) => (
      <span key={currency} className={index === 0 ? "text-2xl font-bold tabular-nums" : "text-sm font-semibold tabular-nums text-muted"}>
        {index > 0 && "+ "}
        {formatMoney(sums[currency], currency)}
      </span>
    ));
  }

  const rangeDays = RANGE_DAYS[range];
  const statsInRange = useMemo(() => mockDailyStats.filter((stat) => stat.daysAgo < rangeDays), [rangeDays]);
  const chartOrders = statsInRange.reduce((sum, stat) => sum + stat.orders, 0);
  const chartRevenueCents = statsInRange.reduce((sum, stat) => sum + stat.revenueUsdCents, 0);
  const chartOrdersLabel = t("chartOrders");
  const chartRevenueLabel = t("chartRevenue");
  const chartData = useMemo(
    () =>
      [...statsInRange]
        .sort((a, b) => b.daysAgo - a.daysAgo)
        .map((stat) => ({
          label: stat.daysAgo === 0 ? t("filterToday") : `-${stat.daysAgo}d`,
          [chartOrdersLabel]: stat.orders,
          [chartRevenueLabel]: stat.revenueUsdCents / 100,
        })),
    [statsInRange, t, chartOrdersLabel, chartRevenueLabel],
  );

  const ordersHref = `/${locale}/mockup/dashboard/orders`;

  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-5 p-4 text-fg md:p-6">
      {!profile.hasProfile && (
        <div className="rounded-DEFAULT border border-dashed border-border p-3 text-sm text-muted">{t("noProfileYet")}</div>
      )}

      <h1 className="text-xl font-bold">{t("navHome")}</h1>

      <SetupChecklist />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={Inbox} label={t("statToHandle")} className="col-span-2 sm:col-span-1">
          <span className="text-2xl font-bold tabular-nums">{needingAction.length}</span>
        </StatCard>
        <StatCard icon={Wallet} label={t("statSalesToday")}>
          {money(salesToday)}
        </StatCard>
        <StatCard icon={Banknote} label={t("statCashToCollect")}>
          {money(cashToCollect)}
        </StatCard>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
        <Card className="flex flex-col p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{t("needsActionTitle")}</h2>
            <Link href={ordersHref} className="flex min-h-touch shrink-0 items-center gap-1 text-sm font-medium text-brand">
              {t("seeAllOrders")}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {needingAction.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
              </span>
              <p className="font-medium">{t("allCaughtUpTitle")}</p>
              <p className="max-w-[36ch] text-sm text-muted">{t("allCaughtUpBody")}</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {needingAction.slice(0, MAX_ACTION_ROWS).map((order) => (
                <li key={order.orderNumber} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 sm:flex">
                  <Link href={sellerOrderHref(locale, order.orderNumber)} className="flex min-h-touch min-w-0 flex-col justify-center sm:flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{order.orderNumber}</span>
                      <OrderStatusPill order={order} />
                    </span>
                    <span className="truncate text-sm text-muted">
                      {order.name} · {placeLabel(order)} · {timeAgo(order.placedAtIso)}
                    </span>
                  </Link>
                  <span className="shrink-0 font-semibold tabular-nums">{formatMoney(order.total, order.currency)}</span>
                  {/* Full width under the order on a phone, at the end of the row from tablet up. */}
                  <div className="col-span-2 shrink-0 [&>button]:w-full sm:[&>button]:w-auto">
                    <OrderNextButton order={order} />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {needingAction.length > MAX_ACTION_ROWS && (
            <Link href={ordersHref} className="flex min-h-touch items-center justify-center border-t border-border text-sm font-medium text-brand">
              {t("moreOrders", { count: needingAction.length - MAX_ACTION_ROWS })}
            </Link>
          )}
        </Card>

        <Card className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              {t("chartTitle")}
              {/* The daily totals need the backend; until then these are made-up numbers, and say so. */}
              <span className="rounded-full bg-border/40 px-2.5 py-1 text-xs font-semibold text-muted">{t("sampleData")}</span>
            </h2>
          </div>
          <SegmentedControl
            value={range}
            onChange={(next) => setRange(next as RangeFilter)}
            options={[
              { value: "today", label: t("filterToday") },
              { value: "7d", label: t("filter7d") },
              { value: "30d", label: t("filter30d") },
            ]}
          />
          <p className="text-sm text-muted">{t("chartTotals", { orders: chartOrders, revenue: formatUsd(chartRevenueCents) })}</p>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="rgb(var(--color-muted))" />
                <YAxis yAxisId="orders" tick={{ fontSize: 11 }} stroke="rgb(var(--color-muted))" allowDecimals={false} />
                <YAxis yAxisId="revenue" orientation="right" hide />
                <Tooltip formatter={(value, name) => (name === chartRevenueLabel ? `$${Number(value).toFixed(2)}` : String(value))} />
                <Bar yAxisId="orders" dataKey={chartOrdersLabel} fill="rgb(var(--color-brand) / 0.35)" radius={[4, 4, 0, 0]} />
                <Line yAxisId="revenue" type="monotone" dataKey={chartRevenueLabel} stroke="rgb(var(--color-brand))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
