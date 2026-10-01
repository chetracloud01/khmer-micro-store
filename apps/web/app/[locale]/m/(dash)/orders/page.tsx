"use client";

import { formatKhmerPhoneLocal } from "@khmer-micro-store/shared";
import { Card } from "@khmer-micro-store/ui";
import { Phone, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { formatMoney, OrderStatusPill, useOrderText } from "@/components/order-ui";
import { api, type SellerOrder } from "@/lib/api";
import { PageLoading, PageOffline } from "../page-states";

// The seller's orders, newest first (roadmap step 4: read-only). Confirming,
// packing, sending and the Telegram alerts arrive with step 6.
export default function OrdersPage() {
  const t = useTranslations("Orders");
  const tApp = useTranslations("App");
  const { paymentLabel, placeLabel, timeAgo } = useOrderText();
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    api<SellerOrder[]>("/orders").then(setOrders, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  if (failed) return <PageOffline onRetry={load} />;
  if (!orders) return <PageLoading />;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">{tApp("ordersReadOnly")}</p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-border/30">
            <ShoppingBag className="h-7 w-7 text-muted" aria-hidden="true" />
          </span>
          <p className="text-sm text-muted">{t("noOrders")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Card className="flex flex-col gap-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{t("orderNumber")} #{order.orderNumber}</p>
                    <p className="text-xs text-muted">{timeAgo(order.createdAt)}</p>
                  </div>
                  <OrderStatusPill order={order} />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <p className="truncate font-medium">{order.buyerName}</p>
                    <a href={`tel:+${order.buyerPhone}`} className="-my-2 flex min-h-touch items-center gap-1 text-brand">
                      <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatKhmerPhoneLocal(order.buyerPhone)}
                    </a>
                    <p className="truncate text-muted">{placeLabel(order)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold tabular-nums">{formatMoney(order.totalMinor, order.currency)}</p>
                    <p className="text-xs text-muted">
                      {t("items")}: {order.itemCount} · {paymentLabel(order)}
                    </p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
