"use client";

import { approximateIn, BUYER_ORDER_STEPS, formatKhmerPhoneLocal, getBuyerProgress } from "@khmer-micro-store/shared";
import { Button, cn } from "@khmer-micro-store/ui";
import { Check, Clock, MapPin, PackageX, Phone, Store, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { BuyerShell } from "@/components/buyer-shell";
import { formatMoney, OrderStatusPill, useOrderText } from "@/components/order-ui";
import type { PublicOrder } from "@/lib/api";

export function OrderView({ order }: { order: PublicOrder | null }) {
  const t = useTranslations("Orders");
  const tStore = useTranslations("Storefront");
  const tCheckout = useTranslations("Checkout");
  const locale = useLocale();
  const { paymentLabel, placeLabel, clockTime } = useOrderText();

  if (!order) {
    return (
      <BuyerShell className="items-center justify-center gap-3 p-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-border/30">
          <PackageX className="h-8 w-8 text-muted" aria-hidden="true" />
        </span>
        <p className="font-semibold">{t("notFoundTitle")}</p>
        <p className="text-sm text-muted">{t("notFoundBody")}</p>
      </BuyerShell>
    );
  }

  const pickup = order.fulfilment === "pickup";
  // A pickup order "out for delivery" is waiting at the shop.
  const shownStatus = pickup && order.status === "out_for_delivery" ? "ready_for_pickup" : pickup && order.status === "failed_delivery" ? "not_collected" : order.status;
  const progress = getBuyerProgress(order.status);
  const text = (km: string, en: string) => (locale === "km" ? km || en : en || km);
  const shopHref = `/${locale}/s/${order.store.slug}`;

  return (
    <BuyerShell className="pb-10">
      <header className="flex items-center gap-3 border-b border-border p-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-lg font-bold text-on-brand">
          {order.store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- the shop's own uploaded logo
            <img src={order.store.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            order.store.name.charAt(0).toUpperCase()
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{order.store.name}</p>
          <p className="text-sm text-muted">
            {t("orderNumber")} #{order.orderNumber}
          </p>
        </div>
        <OrderStatusPill order={order} />
      </header>

      <main className="flex flex-col gap-5 p-4">
        <section className="flex flex-col gap-1" role="status">
          <h1 className="text-xl font-bold leading-normal">{t(`buyerTitle_${shownStatus}`)}</h1>
          <p className="text-sm text-muted">{t(`buyerBody_${shownStatus}`)}</p>
          {order.status === "cancelled" && order.cancelReason && (
            <p className="text-sm">
              {t("cancelReasonLabel")}: {t(`cancelReason_${order.cancelReason}`)}
            </p>
          )}
        </section>

        {progress !== null && (
          <ol aria-label={t("progressLabel")} className="flex flex-col gap-2">
            {BUYER_ORDER_STEPS.map((step, index) => {
              const done = index <= progress;
              const label = pickup && step === "sending" ? t("step_ready") : t(`step_${step}`);
              return (
                <li key={step} className="flex items-center gap-3" aria-current={index === progress ? "step" : undefined}>
                  <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold", done ? "bg-brand text-on-brand" : "bg-border/40 text-muted")}>
                    {done ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className={cn("text-sm", index === progress ? "font-semibold" : done ? "" : "text-muted")}>{label}</span>
                </li>
              );
            })}
          </ol>
        )}

        <section className="flex flex-col gap-2 rounded-2xl border border-border p-4 text-sm">
          <p className="flex items-start gap-2">
            {pickup ? <Store className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" /> : <Truck className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
            <span>
              <span className="block font-medium">{pickup ? t("pickupInfo") : t("deliveryInfo")}</span>
              {order.buyerName} · {pickup ? order.pickupAddress : placeLabel(order)}
              {!pickup && order.landmark && <span className="block text-muted">{order.landmark}</span>}
            </span>
          </p>
          {pickup && order.pickupHours && (
            <p className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              {order.pickupHours}
            </p>
          )}
          {!pickup && order.area === "province" && (
            <p className="flex items-start gap-2 text-muted">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {tCheckout("otherProvince")}
            </p>
          )}
          <p className="text-muted">{paymentLabel(order)}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">{t("items")}</h2>
          <ul className="flex flex-col">
            {order.items.map((item, index) => {
              const title = text(item.titleKm, item.titleEn);
              const option = text(item.variantLabelKm, item.variantLabelEn);
              return (
                <li key={index} className="flex items-start justify-between gap-3 border-b border-border py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block font-medium">
                      {item.quantity} × {title}
                    </span>
                    {option && <span className="block text-muted">{option}</span>}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatMoney(item.lineTotalMinor, order.currency)}</span>
                </li>
              );
            })}
          </ul>
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between text-muted">
              <dt>{tStore("subtotal")}</dt>
              <dd className="tabular-nums">{formatMoney(order.subtotalMinor, order.currency)}</dd>
            </div>
            {order.discountMinor > 0 && (
              <div className="flex justify-between text-success">
                <dt>{tStore("itemDiscount")}</dt>
                <dd className="tabular-nums">-{formatMoney(order.discountMinor, order.currency)}</dd>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <dt>{pickup ? tCheckout("pickup") : tCheckout("deliveryFee")}</dt>
              <dd className="tabular-nums">{order.deliveryFeeMinor === 0 ? tCheckout("free") : formatMoney(order.deliveryFeeMinor, order.currency)}</dd>
            </div>
            {order.vatMinor > 0 && (
              <div className="flex justify-between text-muted">
                <dt>{tStore("vat", { percent: order.vatPercent })}</dt>
                <dd className="tabular-nums">{formatMoney(order.vatMinor, order.currency)}</dd>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-border pt-2">
              <dt className="font-semibold">{t("total")}</dt>
              <dd className="text-right">
                <span className="block text-lg font-bold tabular-nums">{formatMoney(order.totalMinor, order.currency)}</span>
                {/* At the rate frozen on the order, never today's. */}
                <span className="block text-xs text-muted">
                  ≈ {formatMoney(approximateIn(order.totalMinor, order.currency, order.exchangeRateUsed), order.currency === "USD" ? "KHR" : "USD")}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        {order.events.length > 0 && <p className="text-xs text-muted">{clockTime(order.events[order.events.length - 1]!.at)}</p>}

        <div className="flex flex-col gap-2">
          {order.store.phone && (
            <a href={`tel:+${order.store.phone}`} className="flex min-h-touch items-center justify-center gap-2 rounded-DEFAULT border border-border text-sm font-medium">
              <Phone className="h-4 w-4" aria-hidden="true" />
              {t("callShop", { phone: formatKhmerPhoneLocal(order.store.phone) })}
            </a>
          )}
          <Link href={shopHref} className="block">
            <Button variant="secondary" className="w-full">
              {t("backToShop")}
            </Button>
          </Link>
        </div>
      </main>
    </BuyerShell>
  );
}
