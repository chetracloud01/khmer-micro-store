"use client";

import {
  formatKhr,
  formatUsd,
  PHNOM_PENH_DISTRICTS,
  placeName,
  PROVINCES,
  type Currency,
  type DeliveryArea,
  type DispatchRoute,
  type Fulfilment,
  type OrderAction,
  type OrderStatus,
  type PaymentMethod,
} from "@khmer-micro-store/shared";
import { cn } from "@khmer-micro-store/ui";
import { useLocale, useTranslations } from "next-intl";

// One wording and one colour per order status, for the buyer's order page,
// the seller's dashboard and (later) Telegram — design/design-standard.md §7.

/** The parts of an order these helpers read; the mockup's sample orders and the API's orders both fit. */
export interface OrderFactsForText {
  status: OrderStatus;
  fulfilment: Fulfilment;
  paymentMethod: PaymentMethod;
  area: DeliveryArea;
  districtId?: string | null;
  provinceId?: string | null;
}

export const ORDER_STATUS_TONE: Record<OrderStatus, string> = {
  awaiting_payment: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  cod_pending: "bg-warning/10 text-warning",
  confirmed: "bg-info/10 text-info",
  packing: "bg-info/10 text-info",
  waiting_for_driver: "bg-info/10 text-info",
  out_for_delivery: "bg-info/10 text-info",
  delivered: "bg-success/10 text-success",
  completed: "bg-success/10 text-success",
  cancelled: "bg-danger/10 text-danger",
  failed_delivery: "bg-danger/10 text-danger",
};

export function formatMoney(amount: number, currency: Currency): string {
  return currency === "USD" ? formatUsd(amount) : formatKhr(amount);
}

/** Translated texts that depend on an order. */
export function useOrderText() {
  const t = useTranslations("Orders");
  const tCheckout = useTranslations("Checkout");
  const locale = useLocale();

  /** A pickup order is never "out for delivery": at that point it's waiting at the shop. */
  function statusLabel(order: Pick<OrderFactsForText, "status" | "fulfilment">): string {
    if (order.status === "out_for_delivery" && order.fulfilment === "pickup") return t("status_ready_for_pickup");
    if (order.status === "failed_delivery" && order.fulfilment === "pickup") return t("status_not_collected");
    return t(`status_${order.status}`);
  }

  /** A seller's button. Pass the route to name how the order is sent ("Send to driver"); without it, "Send order". */
  function actionLabel(order: Pick<OrderFactsForText, "fulfilment">, action: OrderAction, route?: DispatchRoute): string {
    const pickup = order.fulfilment === "pickup";
    if (action === "dispatch") return pickup ? t("action_dispatch_pickup") : route ? t(`action_dispatch_${route}`) : t("action_dispatch");
    if (action === "mark_delivered" && pickup) return t("action_handed_over");
    if (action === "fail_delivery" && pickup) return t("action_fail_pickup");
    if (action === "rebook" && pickup) return t("action_rebook_pickup");
    return t(`action_${action}`);
  }

  function paymentLabel(order: Pick<OrderFactsForText, "paymentMethod" | "status" | "fulfilment">): string {
    if (order.paymentMethod === "cod") return order.fulfilment === "pickup" ? t("payAtPickup") : t("payCod");
    return order.status === "awaiting_payment" ? t("payOnlinePending") : t("payOnlinePaid");
  }

  /** "Daun Penh, Phnom Penh", "Kampot", or "Pickup". */
  function placeLabel(order: Pick<OrderFactsForText, "fulfilment" | "area" | "districtId" | "provinceId">): string {
    if (order.fulfilment === "pickup") return tCheckout("pickup");
    const district = PHNOM_PENH_DISTRICTS.find((place) => place.id === order.districtId);
    if (district) return `${placeName(district, locale)}, ${tCheckout("phnomPenh")}`;
    const province = PROVINCES.find((place) => place.id === order.provinceId);
    if (province) return placeName(province, locale);
    return order.area === "phnom_penh" ? tCheckout("phnomPenh") : tCheckout("otherProvince");
  }

  function timeAgo(iso: string): string {
    const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
    if (minutes < 1) return t("justNow");
    if (minutes < 60) return t("minutesAgo", { count: minutes });
    if (minutes < 1440) return t("hoursAgo", { count: Math.round(minutes / 60) });
    return t("daysAgo", { count: Math.round(minutes / 1440) });
  }

  /** "14:05" today, "29 Sep, 14:05" otherwise — for the status history. */
  function clockTime(iso: string): string {
    const date = new Date(iso);
    const sameDay = date.toDateString() === new Date().toDateString();
    return date.toLocaleString(locale === "km" ? "km-KH" : "en-GB", {
      ...(sameDay ? {} : { day: "numeric", month: "short" }),
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return { statusLabel, actionLabel, paymentLabel, placeLabel, timeAgo, clockTime };
}

export function OrderStatusPill({ order, className }: { order: Pick<OrderFactsForText, "status" | "fulfilment">; className?: string }) {
  const { statusLabel } = useOrderText();
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        ORDER_STATUS_TONE[order.status],
        className,
      )}
    >
      {statusLabel(order)}
    </span>
  );
}
