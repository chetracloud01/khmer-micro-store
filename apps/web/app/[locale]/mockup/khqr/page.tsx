"use client";

import { Button } from "@khmer-micro-store/ui";
import { Download, Landmark } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { Suspense, useEffect, useState } from "react";
import { mockStore } from "@/mock/mock-data";
import type { OrderRecord } from "@/mock/mock-orders";
import { BuyerShell, BuyerSteps, BuyerTopBar } from "../buyer-shell";
import { useMerchantProfile } from "../merchant-profile-context";
import { formatMoney } from "../order-ui";
import { useOrders } from "../orders-context";
import { KhqrCard } from "./khqr-card";

const QR_LIFETIME_SECONDS = 600; // 10 minutes, NBC's maximum for a KHQR code.

type PaymentStatus = "pending" | "expired";

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// useSearchParams needs a Suspense boundary for Next's static prerender.
export default function KhqrMockupPage() {
  return (
    <Suspense fallback={null}>
      <KhqrPayment />
    </Suspense>
  );
}

// Pays for one order (?order=SC-123456), created at checkout. Only an order
// still awaiting payment gets a code; anything else goes to its order page.
function KhqrPayment() {
  const tOrders = useTranslations("Orders");
  const locale = useLocale();
  const router = useRouter();
  const orderNumber = useSearchParams().get("order") ?? "";
  const { hydrated, orders } = useOrders();
  const order = orders.find((item) => item.orderNumber === orderNumber);

  const orderHref = `/${locale}/mockup/order/${encodeURIComponent(orderNumber)}`;
  const notPayable = hydrated && order !== undefined && order.status !== "awaiting_payment";
  useEffect(() => {
    if (notPayable) router.replace(orderHref);
  }, [notPayable, router, orderHref]);

  if (!hydrated || notPayable) return null;

  if (!order) {
    return (
      <BuyerShell className="items-center justify-center gap-3 p-4 text-center">
        <p className="font-semibold">{tOrders("notFoundTitle")}</p>
        <p className="text-sm text-muted">{tOrders("notFoundBody")}</p>
        <Link href={`/${locale}/mockup/storefront`} className="block">
          <Button variant="primary">{tOrders("backToShop")}</Button>
        </Link>
      </BuyerShell>
    );
  }

  return <PayOrder order={order} orderHref={orderHref} />;
}

function PayOrder({ order, orderHref }: { order: OrderRecord; orderHref: string }) {
  const t = useTranslations("Khqr");
  const tCart = useTranslations("Cart");
  const locale = useLocale();
  const router = useRouter();
  const { act } = useOrders();
  const profile = useMerchantProfile();
  const storeName = profile.hasProfile ? profile.shopName : locale === "km" ? mockStore.nameKm : mockStore.nameEn;

  const [status, setStatus] = useState<PaymentStatus>("pending");
  const [secondsLeft, setSecondsLeft] = useState(QR_LIFETIME_SECONDS);

  // A real, scannable QR image — but its content is a mock string, not a
  // Bakong KHQR payload, so no bank app will take money for it. The API will
  // return the real payload (and its MD5) once payments are wired up.
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(`KHQR-MOCK|${mockStore.slug}|${order.orderNumber}|${order.currency}|${order.total}`, {
      width: 480,
      margin: 0,
      errorCorrectionLevel: "H",
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [order.orderNumber, order.currency, order.total]);

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

  function handleSaveQr() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `khqr-${order.orderNumber}.png`;
    link.click();
  }

  // Dev-only: stands in for the worker polling Bakong every few seconds and
  // confirming payment (see docs/blueprint.md "Flow A: Bakong KHQR"). Once
  // that's wired up, this happens by itself on a real "paid" poll result.
  function handleSimulatePayment() {
    if (act(order.orderNumber, "pay")) router.push(orderHref);
  }

  return (
    <BuyerShell>
      <BuyerTopBar backHref={orderHref} backLabel={t("cancel")} title={t("title")} subtitle={order.orderNumber}>
        <BuyerSteps steps={[tCart("stepCart"), tCart("stepCheckout"), tCart("stepPay")]} current={2} />
      </BuyerTopBar>

      <div className="flex flex-col items-center gap-5 p-4 pb-8">
        <KhqrCard
          merchantName={storeName}
          amountMinor={order.total}
          currency={order.currency}
          qrDataUrl={qrDataUrl}
          qrAlt={t("qrAlt", { amount: formatMoney(order.total, order.currency), shop: storeName })}
          dimmed={status === "expired"}
        />

        {status === "expired" ? (
          <div className="flex w-full max-w-[300px] flex-col items-center gap-3 text-center" role="status">
            <p className="font-semibold text-danger">{t("expiredTitle")}</p>
            <p className="text-sm text-muted">{t("expiredBody")}</p>
            <Button variant="primary" onClick={handleTryAgain} className="w-full">
              {t("tryAgain")}
            </Button>
          </div>
        ) : (
          <div className="flex w-full max-w-[300px] flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-warning motion-reduce:animate-none" aria-hidden="true" />
                  {t("waiting")}
                </span>
                <span className="font-semibold tabular-nums" role="timer" aria-label={t("expiresIn")}>
                  {formatCountdown(secondsLeft)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-border/40" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-brand transition-[width] duration-1000 ease-linear motion-reduce:transition-none"
                  style={{ width: `${(secondsLeft / QR_LIFETIME_SECONDS) * 100}%` }}
                />
              </div>
              <p className="text-sm text-muted">{t("payWithin", { minutes: QR_LIFETIME_SECONDS / 60 })}</p>
            </div>

            {/* On the phone that shows the QR you can't scan it: save it, then upload it in the bank app. */}
            <div className="grid gap-3">
              <Button variant="primary" className="w-full">
                <Landmark className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t("openBankApp")}
              </Button>
              <Button variant="secondary" className="w-full" onClick={handleSaveQr} disabled={!qrDataUrl}>
                <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t("saveQr")}
              </Button>
            </div>

            <ol className="flex flex-col gap-2 rounded-2xl border border-border p-4 text-sm">
              <li className="font-semibold">{t("howTitle")}</li>
              {[t("how1"), t("how2"), t("how3")].map((step, index) => (
                <li key={step} className="flex items-start gap-2 text-muted">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <p className="text-center text-xs text-muted">{t("mockQrNote")}</p>
            <button
              type="button"
              onClick={handleSimulatePayment}
              className="min-h-touch w-full rounded-DEFAULT border border-dashed border-border px-4 text-xs text-muted"
            >
              {t("simulatePayment")}
            </button>
          </div>
        )}
      </div>
    </BuyerShell>
  );
}
