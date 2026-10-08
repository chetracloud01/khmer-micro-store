"use client";

import { formatKhmerPhoneLocal, getOrderTab, ORDER_TABS } from "@khmio/shared";
import { Mio, PageHeader } from "@khmio/ui";
import { Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DataGrid, type DataGridColumn } from "@/components/data-grid";
import { formatMoney, OrderStatusPill, useOrderText } from "@/components/order-ui";
import { SELLER_PAGE } from "@/components/seller-frame/seller-frame";
import { api, type SellerOrder } from "@/lib/api";
import { OrderNextStep } from "../order-next-step";
import { PageLoading, PageOffline } from "../page-states";

// The seller's orders (design/screens.md S4), in the shared data grid: a table
// on a laptop, cards on a phone. Status chips follow the order rules in
// packages/shared orders.ts, and each order carries its one next step — a
// one-tap button, or a link into the order when the step needs details.
export default function OrdersPage() {
  const t = useTranslations("Orders");
  const locale = useLocale();
  const router = useRouter();
  const { paymentLabel, placeLabel, timeAgo, statusLabel } = useOrderText();
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    api<SellerOrder[]>("/orders").then(setOrders, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  if (failed) return <PageOffline onRetry={load} />;
  if (!orders) return <PageLoading />;

  const href = (order: SellerOrder) => `/${locale}/m/orders/${order.id}`;
  /** The one next step: a button when it's one tap, otherwise a link into the order (shared with the home page). */
  const nextStep = (order: SellerOrder, fullWidth = false) => <OrderNextStep order={order} fullWidth={fullWidth} onDone={load} onProblem={setProblem} />;
  const phoneLink = (order: SellerOrder) => (
    <a href={`tel:+${order.buyerPhone}`} onClick={(event) => event.stopPropagation()} className="inline-flex min-h-touch items-center gap-1 text-sm text-brand tabular-nums">
      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
      {formatKhmerPhoneLocal(order.buyerPhone)}
    </a>
  );

  const columns: DataGridColumn<SellerOrder>[] = [
    {
      key: "order",
      header: t("colOrder"),
      hideable: false,
      sortable: true,
      value: (order) => Date.parse(order.createdAt),
      exportValue: (order) => order.orderNumber,
      cell: (order) => (
        <div>
          <p className="font-medium">#{order.orderNumber}</p>
          <p className="text-xs text-muted">{timeAgo(order.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "buyer",
      header: t("colBuyer"),
      sortable: true,
      value: (order) => order.buyerName,
      cell: (order) => (
        <div className="min-w-0">
          <p className="truncate">{order.buyerName}</p>
          {phoneLink(order)}
        </div>
      ),
    },
    { key: "place", header: t("colPlace"), value: (order) => placeLabel(order), cell: (order) => <span className="text-muted">{placeLabel(order)}</span> },
    { key: "payment", header: t("colPayment"), value: (order) => paymentLabel(order), cell: (order) => <span className="text-muted">{paymentLabel(order)}</span> },
    {
      key: "total",
      header: t("colTotal"),
      align: "right",
      sortable: true,
      // Orders can be in either currency, so this sorts within a currency, not across them.
      value: (order) => order.totalMinor,
      exportValue: (order) => formatMoney(order.totalMinor, order.currency),
      cell: (order) => (
        <div>
          <p className="font-semibold tabular-nums">{formatMoney(order.totalMinor, order.currency)}</p>
          <p className="text-xs text-muted">
            {t("items")}: {order.itemCount}
          </p>
        </div>
      ),
    },
    { key: "status", header: t("colStatus"), sortable: true, value: (order) => statusLabel(order), cell: (order) => <OrderStatusPill order={order} /> },
    { key: "next", header: t("colNext"), align: "right", hideable: false, exportValue: () => "", cell: (order) => nextStep(order) },
  ];

  // Open on what needs the seller first; everything when nothing does.
  const initialChip = orders.some((order) => getOrderTab(order.status) === "to_confirm") ? "to_confirm" : "all";

  return (
    <div className={`${SELLER_PAGE} gap-4`}>
      <PageHeader title={t("title")} description={t("description")} />

      {problem && (
        <p role="alert" className="rounded-DEFAULT border border-warning/40 bg-warning/5 p-3 text-sm">
          {problem}
        </p>
      )}

      <DataGrid
        rows={orders}
        getRowId={(order) => order.id}
        columns={columns}
        searchText={(order) => `${order.orderNumber} ${order.buyerName} ${order.buyerPhone} ${formatKhmerPhoneLocal(order.buyerPhone)}`}
        searchPlaceholder={t("searchPlaceholder")}
        chips={ORDER_TABS.map((tab) => ({ value: tab, label: t(`tab_${tab}`), predicate: (order: SellerOrder) => getOrderTab(order.status) === tab }))}
        initialChip={initialChip}
        filters={[
          {
            key: "payment",
            label: t("colPayment"),
            options: [
              { value: "online", label: t("filterOnline") },
              { value: "cod", label: t("filterCash") },
            ],
            predicate: (order, value) => (order.paymentMethod === "cod") === (value === "cod"),
          },
          {
            key: "fulfilment",
            label: t("filterFulfilment"),
            options: [
              { value: "delivery", label: t("filterDelivery") },
              { value: "pickup", label: t("filterPickup") },
            ],
            predicate: (order, value) => order.fulfilment === value,
          },
        ]}
        onRowClick={(order) => router.push(href(order))}
        initialSort={{ key: "order", direction: "desc" }}
        renderCard={(order) => (
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {t("orderNumber")} #{order.orderNumber}
                </p>
                <p className="text-xs text-muted">{timeAgo(order.createdAt)}</p>
              </div>
              <OrderStatusPill order={order} className="shrink-0" />
            </div>
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium">{order.buyerName}</p>
                <p className="truncate text-muted">{placeLabel(order)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-bold tabular-nums">{formatMoney(order.totalMinor, order.currency)}</p>
                <p className="text-xs text-muted">
                  {t("items")}: {order.itemCount} · {paymentLabel(order)}
                </p>
              </div>
            </div>
          </div>
        )}
        renderCardAction={(order) => (
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2">
            {phoneLink(order)}
            {nextStep(order)}
          </div>
        )}
        exportFileName="orders"
        storageKey="seller-orders"
        emptyTitle={t("noOrders")}
        emptyArt={<Mio size={80} />}
      />
    </div>
  );
}
