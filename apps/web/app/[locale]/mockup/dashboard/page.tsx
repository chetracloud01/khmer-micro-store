"use client";

import { isCashOrder, needsSellerAction } from "@khmio/shared";
import { Card, EmptyState, Mio, Skeleton } from "@khmio/ui";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { formatMoney, OrderStatusPill, useOrderText } from "@/components/order-ui";
import { SELLER_PAGE } from "@/components/seller-frame/seller-frame";
import {
  AttentionStrip,
  BestSellers,
  HOME_COLUMNS,
  HOME_ORDER_ROWS,
  HomeHeader,
  HomeStats,
  OrdersToHandle,
  SalesChart,
  type Money,
  type SalesDay,
  type ShopState,
} from "@/components/seller-home";
import { ShopLinkCard } from "@/components/shop-link-card";
import { mockDailyStats, mockMerchant, mockStore } from "@/mock/mock-data";
import type { OrderRecord } from "@/mock/mock-orders";
import { useMerchantProfile } from "../merchant-profile-context";
import { useMerchantSubscription } from "../merchant-subscription-context";
import { OrderNextButton, sellerOrderHref } from "../order-next-button";
import { useOrders } from "../orders-context";
import { useStoreSettings } from "../store-settings-context";
import { SetupChecklist } from "./setup-checklist";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Dollars and riel kept apart — a riel order is never converted (docs/blueprint.md "Multi-currency pricing and totals"). */
function sumByCurrency(orders: OrderRecord[]): Money {
  const sums: Money = { USD: 0, KHR: 0 };
  for (const order of orders) sums[order.currency] += order.total;
  return sums;
}

const isSale = (order: OrderRecord) => order.status !== "cancelled" && order.status !== "awaiting_payment";

export default function DashboardMockupPage() {
  const { hydrated: ordersReady } = useOrders();
  const { hydrated: profileReady } = useMerchantProfile();
  const { hydrated: settingsReady } = useStoreSettings();
  const { hydrated: subscriptionReady } = useMerchantSubscription();
  return ordersReady && profileReady && settingsReady && subscriptionReady ? <DashboardHome /> : <DashboardSkeleton />;
}

function DashboardSkeleton() {
  const t = useTranslations("Dashboard");
  return (
    <div className={`${SELLER_PAGE} gap-5`} aria-busy="true">
      <span className="sr-only" role="status">
        {t("loading")}
      </span>
      <Skeleton className="h-12 w-64" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <div className={HOME_COLUMNS}>
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

// The seller's home mockup (design/screens.md S3): the same shared sections as
// the live page (components/seller-home), fed with the mockup's sample orders.
// The chart's daily totals are made-up numbers, and say so.
function DashboardHome() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const profile = useMerchantProfile();
  const { orders } = useOrders();
  const { settings } = useStoreSettings();
  const { subscription } = useMerchantSubscription();
  const { placeLabel, timeAgo } = useOrderText();

  const now = Date.now();
  const needingAction = orders.filter((order) => needsSellerAction(order.status));
  const today = new Date().toDateString();
  const ageInDays = (order: OrderRecord) => (now - new Date(order.placedAtIso).getTime()) / DAY_MS;
  const thisWeek = orders.filter((order) => isSale(order) && ageInDays(order) < 7);

  const bestSellers = useMemo(() => {
    const totals = new Map<string, { name: string; quantity: number }>();
    for (const order of thisWeek) {
      for (const line of order.lines) {
        const entry = totals.get(line.key) ?? { name: line.label, quantity: 0 };
        entry.quantity += line.qty;
        totals.set(line.key, entry);
      }
    }
    return [...totals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  }, [thisWeek]);

  // Sample daily totals in the same shape as the API's /orders/summary.
  const days: SalesDay[] = useMemo(
    () =>
      [...mockDailyStats]
        .sort((a, b) => b.daysAgo - a.daysAgo)
        .map((stat) => ({ date: new Date(now - stat.daysAgo * DAY_MS).toISOString().slice(0, 10), orders: stat.orders, USD: stat.revenueUsdCents, KHR: 0 })),
    [now],
  );

  const state: ShopState =
    subscription.status === "paused"
      ? { kind: "paused" }
      : subscription.status === "grace"
        ? { kind: "due" }
        : subscription.status === "trialing"
          ? { kind: "trial", daysLeft: subscription.daysLeft }
          : { kind: "open" };

  const base = `/${locale}/mockup/dashboard`;
  const storefrontHref = `/${locale}/mockup/storefront`;
  const shopName = profile.hasProfile ? profile.shopName : locale === "km" ? mockStore.nameKm : mockStore.nameEn;
  const shopLink = <ShopLinkCard url={`${window.location.origin}${storefrontHref}`} shopName={shopName} />;
  const rows = needingAction.slice(0, HOME_ORDER_ROWS).map((order) => ({
    key: order.orderNumber,
    href: sellerOrderHref(locale, order.orderNumber),
    number: order.orderNumber,
    buyer: order.name,
    details: `${placeLabel(order)} · ${timeAgo(order.placedAtIso)}`,
    total: formatMoney(order.total, order.currency),
    status: <OrderStatusPill order={order} />,
    next: <OrderNextButton order={order} />,
  }));

  return (
    <div className={`${SELLER_PAGE} gap-5`}>
      {!profile.hasProfile && <div className="rounded-DEFAULT border border-dashed border-border p-3 text-sm text-muted">{t("noProfileYet")}</div>}
      <HomeHeader firstName={mockMerchant.firstName} state={state} storefrontHref={storefrontHref} addProductHref={`${base}/products/new`} />
      <AttentionStrip count={needingAction.length} href={`${base}/orders`} />
      <SetupChecklist />
      <HomeStats
        waiting={needingAction.length}
        salesToday={sumByCurrency(orders.filter((order) => isSale(order) && new Date(order.placedAtIso).toDateString() === today))}
        cashToCollect={sumByCurrency(orders.filter((order) => isCashOrder(order) && order.status !== "completed" && order.status !== "cancelled"))}
        last7Days={thisWeek.length}
        previous7Days={orders.filter((order) => isSale(order) && ageInDays(order) >= 7 && ageInDays(order) < 14).length}
        defaultCurrency={settings.defaultCurrency}
      />

      {orders.length === 0 ? (
        <div className={HOME_COLUMNS}>
          <Card className="p-4">
            <EmptyState art={<Mio size={96} />} title={t("firstOrderTitle")} body={t("firstOrderBody")} />
          </Card>
          {shopLink}
        </div>
      ) : (
        <div className={HOME_COLUMNS}>
          <OrdersToHandle rows={rows} waiting={needingAction.length} allHref={`${base}/orders`} />
          <div className="flex min-w-0 flex-col gap-5">
            <SalesChart days={days} sample />
            <BestSellers items={bestSellers} />
            {shopLink}
          </div>
        </div>
      )}
    </div>
  );
}
