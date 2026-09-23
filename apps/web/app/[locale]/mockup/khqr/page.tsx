"use client";

import { formatKhr, formatUsd, type Currency } from "@khmer-micro-store/shared";
import { Button } from "@khmer-micro-store/ui";
import { Download, QrCode, Smartphone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { generateOrderNumber, mockStore } from "@/mock/mock-data";
import { useCart } from "../cart-context";
import { useCheckoutTotal } from "../use-checkout-total";

const QR_LIFETIME_SECONDS = 600; // 10 minutes, NBC's maximum for a KHQR code.

type PaymentStatus = "pending" | "expired";

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function KhqrMockupPage() {
  const t = useTranslations("Khqr");
  const tCart = useTranslations("Cart");
  const locale = useLocale();
  const router = useRouter();
  const { quantities, appliedPromo, currency, name, phone, area, landmark, setLastOrder, clearCart } = useCart();
  const { itemCount, total, lines } = useCheckoutTotal(quantities, locale, appliedPromo, currency);

  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [secondsLeft, setSecondsLeft] = useState(QR_LIFETIME_SECONDS);

  useEffect(() => {
    if (status !== "pending") return;
    if (secondsLeft <= 0) {
      setStatus("expired");
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, secondsLeft]);

  function handleTryAgain() {
    setSecondsLeft(QR_LIFETIME_SECONDS);
    setStatus("pending");
  }

  // Dev-only: stands in for the worker polling Bakong every few seconds and
  // confirming payment (see docs/blueprint.md "Flow A: Bakong KHQR"). Once
  // that's wired up, this becomes the callback that fires on a real "paid"
  // poll result instead of a button click.
  function handleSimulatePayment() {
    setLastOrder({
      orderNumber: generateOrderNumber(mockStore),
      currency,
      total,
      lines: lines.map((line) => ({
        key: line.key,
        label: line.title,
        qty: line.qty,
        lineTotal: line.discounted * line.qty,
      })),
      name,
      phone,
      area,
      landmark,
      placedAtIso: new Date().toISOString(),
    });
    clearCart();
    router.push(`/${locale}/mockup/order-success`);
  }

  const storeName = locale === "km" ? mockStore.nameKm : mockStore.nameEn;
  const format = (amount: number, cur: Currency) => (cur === "USD" ? formatUsd(amount) : formatKhr(amount));

  if (itemCount === 0) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-3 bg-bg p-4 text-center text-fg">
        <p className="text-sm text-muted">{tCart("empty")}</p>
        <Link href={`/${locale}/mockup/storefront`}>
          <Button variant="primary">{tCart("browseMenu")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-4 bg-bg p-4 text-fg">
      <div className="flex items-center justify-between">
        <Link href={`/${locale}/mockup/checkout`} className="text-sm font-medium text-muted">
          {t("cancel")}
        </Link>
        <h1 className="text-lg font-semibold">{t("title")}</h1>
        <span className="w-12" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-center gap-4 rounded-DEFAULT border border-border bg-bg p-6 shadow-sm">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
          {storeName.charAt(0)}
        </div>
        <p className="font-medium">{storeName}</p>
        <p className="text-3xl font-bold text-fg">{format(total, currency)}</p>

        {status === "expired" ? (
          <>
            <p className="font-semibold text-danger">{t("expiredTitle")}</p>
            <p className="text-center text-sm text-muted">{t("expiredBody")}</p>
            <Button variant="primary" onClick={handleTryAgain} className="w-full">
              {t("tryAgain")}
            </Button>
          </>
        ) : (
          <>
            <div className="flex h-48 w-48 items-center justify-center rounded-DEFAULT border-2 border-dashed border-border bg-border/10">
              <QrCode className="h-32 w-32 text-fg" aria-hidden="true" />
            </div>
            <p className="text-center text-xs text-muted">{t("mockQrNote")}</p>

            <div className="flex flex-col items-center gap-1">
              <span className="text-xs text-muted">{t("expiresIn")}</span>
              <span className="font-mono text-xl font-semibold text-fg">{formatCountdown(secondsLeft)}</span>
            </div>

            <div className="grid w-full grid-cols-2 gap-3">
              <Button variant="secondary" className="w-full">
                <Download className="h-4 w-4" aria-hidden="true" />
                {t("saveQr")}
              </Button>
              <Button variant="secondary" className="w-full">
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                {t("openBankApp")}
              </Button>
            </div>

            <button
              type="button"
              onClick={handleSimulatePayment}
              className="min-h-touch rounded-DEFAULT border border-dashed border-border px-4 text-xs text-muted"
            >
              {t("simulatePayment")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
