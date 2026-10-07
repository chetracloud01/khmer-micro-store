"use client";

import { formatKhmerPhoneLocal, getOrderTab, getSellerActions, ORDER_TABS, type OrderTab, type SellerOrderAction } from "@khmio/shared";
import { Button, Card, cn, Mio } from "@khmio/ui";
import { ChevronRight, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatMoney, OrderStatusPill, useOrderText } from "@/components/order-ui";
import { api, ApiError, type SellerOrder } from "@/lib/api";
import { PageLoading, PageOffline } from "../page-states";

/** Steps that need nothing more than one tap. Sending and cancelling ask for details, so they open the order. */
const ONE_TAP: readonly SellerOrderAction[] = ["confirm", "start_packing", "driver_picked_up", "mark_delivered", "settle_cash", "rebook"];

/** The order's next step, or null when there's nothing to do but look. */
function nextAction(order: SellerOrder): SellerOrderAction | null {
  const action = getSellerActions(order)[0];
  return action && action !== "cancel" ? (action as SellerOrderAction) : null;
}

// The seller's orders (design/screens.md S4): tabs follow the order rules in
// packages/shared orders.ts, and each order carries its one next step.
export default function OrdersPage() {
  const t = useTranslations("Orders");
  const tStore = useTranslations("Storefront");
  const tApp = useTranslations("App");
  const locale = useLocale();
  const { paymentLabel, placeLabel, timeAgo, actionLabel } = useOrderText();
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<OrderTab | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    api<SellerOrder[]>("/orders").then(setOrders, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  async function doStep(order: SellerOrder, action: SellerOrderAction) {
    setBusyId(order.id);
    setProblem(null);
    try {
      await api(`/orders/${order.id}/actions`, { method: "POST", body: { action } });
    } catch (failure) {
      setProblem(failure instanceof ApiError && failure.code === "store_paused" ? tApp("storePaused") : failure instanceof ApiError && failure.code === "action_not_allowed" ? tApp("orderMovedOn") : tApp("saveFailed"));
    } finally {
      setBusyId(null);
      load();
    }
  }

  if (failed) return <PageOffline onRetry={load} />;
  if (!orders) return <PageLoading />;

  const counts = new Map<OrderTab, number>();
  for (const order of orders) counts.set(getOrderTab(order.status), (counts.get(getOrderTab(order.status)) ?? 0) + 1);
  const shown = tab === "all" ? orders : orders.filter((order) => getOrderTab(order.status) === tab);
  const chip = (value: OrderTab | "all", label: string, count: number) => (
    <button
      key={value}
      type="button"
      aria-pressed={tab === value}
      onClick={() => setTab(value)}
      className={cn(
        "flex min-h-touch shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-medium",
        tab === value ? "border-brand bg-brand text-on-brand" : "border-border bg-bg text-muted hover:text-fg",
      )}
    >
      {label}
      <span className={cn("rounded-full px-1.5 text-xs", tab === value ? "bg-on-brand/20" : "bg-border/40")}>{count}</span>
    </button>
  );

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("description")}</p>
      </div>

      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {chip("all", tStore("categoryAll"), orders.length)}
        {ORDER_TABS.map((value) => chip(value, t(`tab_${value}`), counts.get(value) ?? 0))}
      </div>

      {problem && (
        <p role="alert" className="rounded-DEFAULT border border-warning/40 bg-warning/5 p-3 text-sm">
          {problem}
        </p>
      )}

      {shown.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Mio size={80} />
          <p className="text-sm text-muted">{t("noOrders")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((order) => {
            const action = nextAction(order);
            const href = `/${locale}/m/orders/${order.id}`;
            return (
              <li key={order.id}>
                <Card className="flex flex-col gap-3 p-4">
                  <Link href={href} className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {t("orderNumber")} #{order.orderNumber}
                        </p>
                        <p className="text-xs text-muted">{timeAgo(order.createdAt)}</p>
                      </div>
                      <OrderStatusPill order={order} />
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
                  </Link>
                  <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                    <a href={`tel:+${order.buyerPhone}`} className="flex min-h-touch items-center gap-1 text-sm text-brand">
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatKhmerPhoneLocal(order.buyerPhone)}
                    </a>
                    {action && ONE_TAP.includes(action) ? (
                      <Button variant="primary" className="whitespace-nowrap px-3 text-sm" loading={busyId === order.id} onClick={() => void doStep(order, action)}>
                        {actionLabel(order, action)}
                      </Button>
                    ) : (
                      <Link href={href} className="flex min-h-touch items-center gap-1 text-sm font-medium text-brand">
                        {action ? actionLabel(order, action) : t("view")}
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
