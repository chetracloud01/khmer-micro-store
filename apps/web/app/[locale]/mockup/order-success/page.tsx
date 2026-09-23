"use client";

import { formatKhr, formatUsd, type Currency } from "@khmer-micro-store/shared";
import { Button } from "@khmer-micro-store/ui";
import { Check, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useCart } from "../cart-context";

export default function OrderSuccessMockupPage() {
  const t = useTranslations("OrderSuccess");
  const tStore = useTranslations("Storefront");
  const tCheckout = useTranslations("Checkout");
  const tKhqr = useTranslations("Khqr");
  const locale = useLocale();
  const { lastOrder } = useCart();

  const format = (amount: number, cur: Currency) => (cur === "USD" ? formatUsd(amount) : formatKhr(amount));

  if (!lastOrder) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-3 bg-bg p-4 text-center text-fg">
        <p className="text-sm text-muted">{t("noRecentOrder")}</p>
        <Link href={`/${locale}/mockup/storefront`}>
          <Button variant="primary">{tKhqr("backToStorefront")}</Button>
        </Link>
      </div>
    );
  }

  const areaLabel = lastOrder.area === "phnom_penh" ? tCheckout("phnomPenh") : tCheckout("otherProvince");

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-4 bg-bg p-4 pb-8 text-fg">
      <div className="flex flex-col items-center gap-2 pt-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <Check className="h-8 w-8 text-success" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-bold">{t("title")}</h1>
        <p className="text-sm text-muted">
          {t("orderNumber")}: <span className="font-semibold text-fg">{lastOrder.orderNumber}</span>
        </p>
      </div>

      <div className="flex flex-col gap-2 rounded-DEFAULT border border-border p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t("items")}</span>
        {lastOrder.lines.map((line) => (
          <div key={line.key} className="flex items-center justify-between text-sm">
            <span>
              {line.label} × {line.qty}
            </span>
            <span className="font-medium">{format(line.lineTotal, lastOrder.currency)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
          <span>{tStore("totalToPay")}</span>
          <span>{format(lastOrder.total, lastOrder.currency)}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-DEFAULT border border-border p-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted">{t("deliveryInfo")}</span>
        <div className="flex flex-col gap-1 text-sm">
          <span>{lastOrder.name}</span>
          <span>+{lastOrder.phone}</span>
          <span>{areaLabel}</span>
          {lastOrder.landmark && <span className="text-muted">{lastOrder.landmark}</span>}
        </div>
      </div>

      {/* Inert until the Telegram bot integration exists (blueprint Stage G). */}
      <Button variant="secondary" className="w-full">
        <Send className="h-4 w-4" aria-hidden="true" />
        {t("getUpdatesOnTelegram")}
      </Button>

      <Link href={`/${locale}/mockup/storefront`}>
        <Button variant="primary" className="w-full">
          {tKhqr("backToStorefront")}
        </Button>
      </Link>
    </div>
  );
}
