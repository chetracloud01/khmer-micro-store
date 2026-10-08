"use client";

import type { Currency } from "@khmio/shared";
import { Button, Card, EmptyState, PageHeader, SegmentedControl, StatCard, StatusPill } from "@khmio/ui";
import { Banknote, ChevronRight, ExternalLink, Inbox, Plus, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/components/order-ui";

// The seller's home page (design/screens.md S3), section by section — one set
// for the live dashboard (/m) and its mockup, each feeding its own data (the
// API's /orders/summary, or the mockup's samples). Dollars and riel are always
// shown apart, never added together.

export type Money = Record<Currency, number>;

/** Where the shop stands, for the pill under the greeting. */
export type ShopState = { kind: "open" } | { kind: "trial"; daysLeft: number } | { kind: "due" } | { kind: "paused" };

export function HomeHeader({ firstName, state, storefrontHref, addProductHref }: { firstName: string; state: ShopState; storefrontHref: string; addProductHref: string }) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("greetingMorning", { name: firstName }) : hour < 17 ? t("greetingAfternoon", { name: firstName }) : t("greetingEvening", { name: firstName });
  const date = new Intl.DateTimeFormat(locale === "km" ? "km-KH" : "en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const pill =
    state.kind === "paused"
      ? { tone: "danger" as const, label: t("statusPaused") }
      : state.kind === "due"
        ? { tone: "warning" as const, label: t("statusDue") }
        : state.kind === "trial"
          ? { tone: "brand" as const, label: t("statusTrial", { count: state.daysLeft }) }
          : { tone: "success" as const, label: t("statusOpen") };
  return (
    <div className="flex flex-col gap-3">
      <PageHeader
        title={greeting}
        description={`${date} · ${t("homeSubtitle")}`}
        actions={
          <>
            {/* From 768 px "View my shop" sits in the frame's top bar. */}
            <Link href={storefrontHref} target="_blank" className="md:hidden">
              <Button variant="secondary">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                {t("actionViewShop")}
              </Button>
            </Link>
            <Link href={addProductHref}>
              <Button variant="primary">
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("actionAddProduct")}
              </Button>
            </Link>
          </>
        }
      />
      <StatusPill tone={pill.tone} className="self-start">
        {pill.label}
      </StatusPill>
    </div>
  );
}

/** "3 orders need you": only when something is waiting. */
export function AttentionStrip({ count, href }: { count: number; href: string }) {
  const t = useTranslations("Dashboard");
  if (count === 0) return null;
  return (
    <Link href={href} className="group flex items-center gap-3 rounded-DEFAULT border border-warning/40 bg-warning/5 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
        <Inbox className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{t("attentionOrders", { count })}</span>
        <span className="block text-sm text-muted">{t("attentionBody")}</span>
      </span>
      <span className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-warning sm:flex">
        {t("attentionCta")}
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-warning sm:hidden" aria-hidden="true" />
    </Link>
  );
}

/** The bigger currency on the number line, the other as the second line; one zero in the shop's currency when there's nothing. */
function moneyLines(sums: Money, defaultCurrency: Currency): { value: string; detail?: string } {
  const shown = (["USD", "KHR"] as const).filter((currency) => sums[currency] > 0);
  if (shown.length === 0) return { value: formatMoney(0, defaultCurrency) };
  const [first, second] = shown;
  return { value: formatMoney(sums[first!], first!), detail: second ? `+ ${formatMoney(sums[second], second)}` : undefined };
}

export function HomeStats({
  waiting,
  salesToday,
  cashToCollect,
  last7Days,
  previous7Days,
  defaultCurrency,
}: {
  waiting: number;
  salesToday: Money;
  cashToCollect: Money;
  last7Days: number;
  previous7Days: number;
  defaultCurrency: Currency;
}) {
  const t = useTranslations("Dashboard");
  const sales = moneyLines(salesToday, defaultCurrency);
  const cash = moneyLines(cashToCollect, defaultCurrency);
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard icon={Inbox} label={t("statToHandle")} value={String(waiting)} tone={waiting > 0 ? "warning" : "success"} />
      <StatCard icon={Wallet} label={t("statSalesToday")} value={sales.value} detail={sales.detail} />
      <StatCard icon={Banknote} label={t("statCashToCollect")} value={cash.value} detail={cash.detail} tone="info" />
      <StatCard icon={TrendingUp} label={t("statThisWeek")} value={String(last7Days)} detail={t("statWeekBefore", { count: previous7Days })} tone="success" />
    </div>
  );
}

/** One row of "Orders needing action", already in words; `next` is the row's next-step button or link. */
export interface HomeOrderRow {
  key: string;
  href: string;
  number: string;
  buyer: string;
  /** Place · how long ago. */
  details: string;
  total: string;
  status: ReactNode;
  next: ReactNode;
}

/** Laptop: the rows read as a table — order, buyer, total, status, next step. */
const ORDER_COLUMNS = "lg:grid-cols-[110px_minmax(0,1fr)_110px_150px_auto]";
export const HOME_ORDER_ROWS = 5;

export function OrdersToHandle({ rows, waiting, allHref }: { rows: HomeOrderRow[]; waiting: number; allHref: string }) {
  const t = useTranslations("Dashboard");
  return (
    <Card className="flex min-w-0 flex-col p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{t("needsActionTitle")}</h2>
        <Link href={allHref} className="flex min-h-touch shrink-0 items-center gap-1 text-sm font-medium text-brand">
          {t("seeAllOrders")}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={ShoppingBag} title={t("allCaughtUpTitle")} body={t("allCaughtUpBody")} />
      ) : (
        <>
          <div className={`mt-2 hidden gap-3 border-b border-border pb-2 text-xs font-semibold uppercase tracking-wide text-muted lg:grid ${ORDER_COLUMNS}`}>
            <span>{t("colOrder")}</span>
            <span>{t("colBuyer")}</span>
            <span className="text-right">{t("colTotal")}</span>
            <span>{t("colStatus")}</span>
            <span className="text-right">{t("colNext")}</span>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {rows.map((row) => (
              <li key={row.key} className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 py-3 ${ORDER_COLUMNS}`}>
                <Link href={row.href} className="flex min-h-touch min-w-0 flex-col justify-center lg:contents">
                  <span className="flex flex-wrap items-center gap-2 font-medium lg:block">
                    {row.number}
                    <span className="lg:hidden">{row.status}</span>
                  </span>
                  <span className="truncate text-sm text-muted lg:text-fg">
                    {row.buyer}
                    <span className="text-muted"> · {row.details}</span>
                  </span>
                </Link>
                <span className="shrink-0 text-right font-semibold tabular-nums">{row.total}</span>
                <span className="hidden lg:block">{row.status}</span>
                {/* Full width under the order on a phone, at the end of the row on a laptop. */}
                <div className="col-span-2 flex shrink-0 lg:col-span-1 lg:justify-self-end [&>*]:w-full lg:[&>*]:w-auto">{row.next}</div>
              </li>
            ))}
          </ul>
        </>
      )}
      {waiting > rows.length && (
        <Link href={allHref} className="flex min-h-touch items-center justify-center border-t border-border text-sm font-medium text-brand">
          {t("moreOrders", { count: waiting - rows.length })}
        </Link>
      )}
    </Card>
  );
}

/** One day of sales: orders and money in each currency (cents, riel). */
export interface SalesDay {
  /** "2026-10-08" */
  date: string;
  orders: number;
  USD: number;
  KHR: number;
}

type Range = "today" | "7d" | "30d";
const RANGE_DAYS: Record<Range, number> = { today: 1, "7d": 7, "30d": 30 };

/** Orders per day, with the money for the chosen range under the title. `sample` marks made-up numbers (the mockup). */
export function SalesChart({ days, sample = false }: { days: SalesDay[]; sample?: boolean }) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const [range, setRange] = useState<Range>("7d");
  const inRange = days.slice(-RANGE_DAYS[range]);
  const orders = inRange.reduce((sum, day) => sum + day.orders, 0);
  const totals: Money = { USD: inRange.reduce((sum, day) => sum + day.USD, 0), KHR: inRange.reduce((sum, day) => sum + day.KHR, 0) };
  const revenue = (["USD", "KHR"] as const)
    .filter((currency) => totals[currency] > 0)
    .map((currency) => formatMoney(totals[currency], currency))
    .join(" + ") || formatMoney(0, "USD");
  const ordersLabel = t("chartOrders");
  const dayLabel = useMemo(() => new Intl.DateTimeFormat(locale === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" }), [locale]);
  const data = inRange.map((day) => ({ label: dayLabel.format(new Date(`${day.date}T00:00:00Z`)), [ordersLabel]: day.orders }));
  return (
    <Card className="flex flex-col gap-3 p-4">
      <h2 className="flex flex-wrap items-center gap-2 font-semibold">
        {t("chartTitle")}
        {sample && <span className="rounded-full bg-border/40 px-2.5 py-1 text-xs font-semibold text-muted">{t("sampleData")}</span>}
      </h2>
      <SegmentedControl
        value={range}
        onChange={(next) => setRange(next as Range)}
        options={[
          { value: "today", label: t("filterToday") },
          { value: "7d", label: t("filter7d") },
          { value: "30d", label: t("filter30d") },
        ]}
      />
      <p className="text-sm text-muted">{t("chartTotals", { orders, revenue })}</p>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="rgb(var(--color-muted))" />
            <YAxis tick={{ fontSize: 11 }} stroke="rgb(var(--color-muted))" allowDecimals={false} />
            <Tooltip />
            <Bar dataKey={ordersLabel} fill="rgb(var(--color-brand) / 0.6)" radius={[4, 4, 0, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/** This week's best sellers by quantity. */
export function BestSellers({ items }: { items: { name: string; quantity: number }[] }) {
  const t = useTranslations("Dashboard");
  return (
    <Card className="flex flex-col gap-2 p-4">
      <h2 className="font-semibold">{t("topProductsTitle")}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t("topProductsEmpty")}</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {items.map((item, index) => (
            <li key={`${index}-${item.name}`} className="flex min-h-touch items-center gap-3 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.name}</span>
              <span className="shrink-0 text-sm tabular-nums text-muted">{t("topProductsSold", { count: item.quantity })}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/** The home page's two columns from 1024 px: the main list, and a narrower side column. */
export const HOME_COLUMNS = "grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start";
