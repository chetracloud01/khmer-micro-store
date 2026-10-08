"use client";

import { needsSellerAction } from "@khmio/shared";
import { Card, EmptyState, Mio, Skeleton } from "@khmio/ui";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { formatMoney, OrderStatusPill, useOrderText } from "@/components/order-ui";
import { SELLER_PAGE } from "@/components/seller-frame/seller-frame";
import { AttentionStrip, BestSellers, HOME_COLUMNS, HOME_ORDER_ROWS, HomeHeader, HomeStats, OrdersToHandle, SalesChart } from "@/components/seller-home";
import { api, type SellerOrder } from "@/lib/api";
import { shopStateOf, useMerchant } from "./merchant-context";
import { OrderNextStep } from "./order-next-step";
import { SetupChecklist } from "./setup-checklist";
import { ShareShop } from "./share-shop";

// The seller's home (design/screens.md S3), from the shared sections in
// components/seller-home — the same ones as its mockup. The numbers come
// from GET /orders/summary (kept fresh by the dashboard layout, every minute
// and after each order step); the rows from the order list.
export default function MerchantHomePage() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const { me, store, summary, refreshSummary } = useMerchant();
  const { placeLabel, timeAgo } = useOrderText();
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const loadOrders = useCallback(() => {
    api<SellerOrder[]>("/orders").then(setOrders, () => setOrders((previous) => previous ?? []));
  }, []);
  // Again whenever the layout's minute refresh sees the waiting count change, so the rows follow the numbers.
  const waiting = summary?.waiting ?? 0;
  useEffect(loadOrders, [loadOrders, waiting]);

  const base = `/${locale}/m`;
  const header = (
    <HomeHeader firstName={me.merchant.firstName} state={shopStateOf(me, store)} storefrontHref={`/${locale}/s/${store.slug}`} addProductHref={`${base}/products/new`} />
  );
  const share = (
    // The setup checklist's "Share your shop" step jumps here.
    <div id="share" className="scroll-mt-4">
      <ShareShop />
    </div>
  );

  if (!summary || !orders) {
    return (
      <div className={`${SELLER_PAGE} gap-5`} aria-busy="true">
        {header}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const toHandle = orders.filter((order) => needsSellerAction(order.status));
  const rows = toHandle.slice(0, HOME_ORDER_ROWS).map((order) => ({
    key: order.id,
    href: `${base}/orders/${order.id}`,
    number: `#${order.orderNumber}`,
    buyer: order.buyerName,
    details: `${placeLabel(order)} · ${timeAgo(order.createdAt)}`,
    total: formatMoney(order.totalMinor, order.currency),
    status: <OrderStatusPill order={order} />,
    next: (
      <OrderNextStep
        order={order}
        onDone={() => {
          loadOrders();
          void refreshSummary();
        }}
        onProblem={setProblem}
      />
    ),
  }));
  const bestSellers = summary.bestSellers.map((item) => ({ name: locale === "km" ? item.nameKm || item.nameEn : item.nameEn || item.nameKm, quantity: item.quantity }));

  return (
    <div className={`${SELLER_PAGE} gap-5`}>
      {header}
      <AttentionStrip count={summary.waiting} href={`${base}/orders`} />
      <SetupChecklist />
      <HomeStats
        waiting={summary.waiting}
        salesToday={summary.salesToday}
        cashToCollect={summary.cashToCollect}
        last7Days={summary.ordersLast7Days}
        previous7Days={summary.ordersPrevious7Days}
        defaultCurrency="USD"
      />
      {problem && (
        <p role="alert" className="rounded-DEFAULT bg-danger/10 px-4 py-2 text-sm text-danger">
          {problem}
        </p>
      )}

      {orders.length === 0 ? (
        <div className={HOME_COLUMNS}>
          <Card className="p-4">
            <EmptyState art={<Mio size={96} />} title={t("firstOrderTitle")} body={t("firstOrderBody")} />
          </Card>
          {share}
        </div>
      ) : (
        <div className={HOME_COLUMNS}>
          <OrdersToHandle rows={rows} waiting={summary.waiting} allHref={`${base}/orders`} />
          <div className="flex min-w-0 flex-col gap-5">
            <SalesChart days={summary.days} />
            <BestSellers items={bestSellers} />
            {share}
          </div>
        </div>
      )}
    </div>
  );
}
