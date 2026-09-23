"use client";

import { formatKhr, formatUsd } from "@khmer-micro-store/shared";
import { Button, cn } from "@khmer-micro-store/ui";
import { ArrowLeft, ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { mockPromoCodes, mockStore } from "@/mock/mock-data";
import { useCart } from "../cart-context";
import { useCartSummary } from "../use-cart-summary";

export default function CartMockupPage() {
  const t = useTranslations("Cart");
  const tStore = useTranslations("Storefront");
  const locale = useLocale();
  const { quantities, setQuantities, appliedPromo, setAppliedPromo } = useCart();

  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const {
    cartCount,
    cartLines,
    originalSubtotalUsdCents,
    itemDiscountUsdCents,
    promoDiscountUsdCents,
    vatUsdCents,
    totalUsdCents,
    totalKhr,
  } = useCartSummary(quantities, locale, appliedPromo);

  function adjustQuantity(key: string, delta: number) {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[key] ?? 0) + delta);
      return { ...prev, [key]: next };
    });
  }

  function handleApplyPromo() {
    const match = mockPromoCodes.find(
      (promo) => promo.code.toLowerCase() === promoInput.trim().toLowerCase(),
    );
    if (!match) {
      setPromoError(tStore("promoInvalid"));
      return;
    }
    setAppliedPromo(match);
    setPromoError(null);
    setShowPromoInput(false);
  }

  function handleRemovePromo() {
    setAppliedPromo(null);
    setPromoInput("");
  }

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[480px] flex-col bg-bg pb-24 text-fg">
      <header className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/mockup/storefront`}
            aria-label={t("stepMenu")}
            className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-border/30"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">{t("title")}</span>
            <span className="text-xs text-muted">{locale === "km" ? mockStore.nameKm : mockStore.nameEn}</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs font-medium">
          <span className="text-muted">{t("stepMenu")}</span>
          <ChevronRight className="h-3 w-3 text-muted" aria-hidden="true" />
          <span className="text-brand">{t("stepCart")}</span>
          <ChevronRight className="h-3 w-3 text-muted" aria-hidden="true" />
          <span className="text-muted">{t("stepCheckout")}</span>
        </div>

      </header>

      <main className="flex flex-col gap-4 p-4">
        {cartCount === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted">{t("empty")}</p>
            <Link href={`/${locale}/mockup/storefront`}>
              <Button variant="primary">{t("browseMenu")}</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {cartLines.map((line) => (
                <div key={line.key} className="flex items-center gap-3 border-b border-border pb-3">
                  <div className="h-14 w-14 shrink-0 rounded-DEFAULT bg-border/40" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.label}</p>
                    <p className="text-sm font-semibold text-fg">{formatUsd(line.lineTotalUsdCents)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      aria-label={
                        line.qty === 1
                          ? tStore("remove")
                          : tStore("decrease", { title: line.label })
                      }
                      onClick={() => adjustQuantity(line.key, -1)}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-muted"
                    >
                      {line.qty === 1 ? (
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <span className="text-lg font-bold">−</span>
                      )}
                    </button>
                    <span className="w-4 text-center text-sm font-semibold">{line.qty}</span>
                    <button
                      type="button"
                      aria-label={tStore("increase", { title: line.label })}
                      onClick={() => adjustQuantity(line.key, 1)}
                      className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-bold text-white"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Link
              href={`/${locale}/mockup/storefront`}
              className="flex min-h-touch items-center text-sm font-medium text-brand"
            >
              + {t("addMoreItems")}
            </Link>

            {!appliedPromo && !showPromoInput && (
              <button
                type="button"
                onClick={() => setShowPromoInput(true)}
                className="min-h-touch text-left text-sm font-medium text-brand"
              >
                {tStore("havePromoCode")}
              </button>
            )}
            {!appliedPromo && showPromoInput && (
              <div className="flex items-center gap-2">
                <input
                  value={promoInput}
                  onChange={(e) => {
                    setPromoInput(e.target.value);
                    setPromoError(null);
                  }}
                  placeholder={tStore("promoPlaceholder")}
                  className="min-h-touch flex-1 rounded-DEFAULT border border-border bg-bg px-3 text-sm uppercase text-fg placeholder:normal-case placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <Button variant="secondary" onClick={handleApplyPromo} className="px-4 text-sm">
                  {tStore("apply")}
                </Button>
              </div>
            )}
            {promoError && <p className="text-xs text-danger">{promoError}</p>}
            {appliedPromo && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-success">
                  {tStore("promoApplied", { code: appliedPromo.code })}
                </span>
                <button type="button" onClick={handleRemovePromo} className="text-xs text-muted underline">
                  {tStore("remove")}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSummaryExpanded((v) => !v)}
              aria-expanded={summaryExpanded}
              className="flex min-h-touch items-center justify-between border-t border-border pt-2 text-sm font-medium text-brand"
            >
              {summaryExpanded ? t("hideSummary") : t("seeSummary")}
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", summaryExpanded && "rotate-180")}
                aria-hidden="true"
              />
            </button>

            {summaryExpanded && (
              <div className="flex flex-col gap-1 text-sm">
                <div className="flex items-center justify-between text-muted">
                  <span>{tStore("subtotal")}</span>
                  <span>{formatUsd(originalSubtotalUsdCents)}</span>
                </div>
                {itemDiscountUsdCents > 0 && (
                  <div className="flex items-center justify-between text-success">
                    <span>{tStore("itemDiscount")}</span>
                    <span>-{formatUsd(itemDiscountUsdCents)}</span>
                  </div>
                )}
                {promoDiscountUsdCents > 0 && (
                  <div className="flex items-center justify-between text-success">
                    <span>{tStore("promoDiscount")}</span>
                    <span>-{formatUsd(promoDiscountUsdCents)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-muted">
                  <span>{tStore("vat", { percent: mockStore.vatPercent })}</span>
                  <span>{formatUsd(vatUsdCents)}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="font-semibold text-fg">{tStore("totalToPay")}</span>
              <span className="text-right">
                <span className="block font-semibold text-fg">{formatUsd(totalUsdCents)}</span>
                <span className="block text-xs text-muted">{formatKhr(totalKhr)}</span>
              </span>
            </div>
          </>
        )}
      </main>

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] border-t border-border bg-bg p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
          <Link href={`/${locale}/mockup/checkout`}>
            <Button variant="primary" className="w-full">
              {t("reviewPayment")}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
