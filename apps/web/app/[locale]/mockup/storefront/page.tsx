"use client";

import { convertUsdCentsToKhr, formatKhr, formatUsd } from "@khmer-micro-store/shared";
import {
  Badge,
  Button,
  Card,
  cn,
  DiscountBadge,
  PriceTag,
  SearchInput,
  SegmentedControl,
} from "@khmer-micro-store/ui";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getDiscountedKhr,
  getDiscountedUsdCents,
  getEffectiveExchangeRate,
  mockCategories,
  mockPromoCodes,
  mockProducts,
  mockStore,
  type MockProduct,
} from "@/mock/mock-data";

function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-touch shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors",
        active ? "border-brand bg-brand text-white" : "border-border bg-bg text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export default function StorefrontMockupPage() {
  const t = useTranslations("Storefront");
  const locale = useLocale();
  const router = useRouter();
  const storeName = locale === "km" ? mockStore.nameKm : mockStore.nameEn;

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromo, setAppliedPromo] = useState<(typeof mockPromoCodes)[number] | null>(null);

  const visibleProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      const inCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
      const title = locale === "km" ? product.titleKm : product.titleEn;
      const matchesSearch = title.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return inCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, locale]);

  const cartCount = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

  // Subtotal at full (pre-discount) price, and how much the per-item master-data
  // discounts take off it — kept separate so the cart summary can show both lines.
  const originalSubtotalUsdCents = mockProducts.reduce((sum, product) => {
    const qty = quantities[product.id] ?? 0;
    return product.priceUsdCents != null ? sum + product.priceUsdCents * qty : sum;
  }, 0);
  const subtotalAfterItemDiscountUsdCents = mockProducts.reduce((sum, product) => {
    const qty = quantities[product.id] ?? 0;
    const unitPrice = getDiscountedUsdCents(product);
    return unitPrice != null ? sum + unitPrice * qty : sum;
  }, 0);
  const itemDiscountUsdCents = originalSubtotalUsdCents - subtotalAfterItemDiscountUsdCents;

  const promoDiscountUsdCents = !appliedPromo
    ? 0
    : appliedPromo.type === "percent"
      ? Math.round(subtotalAfterItemDiscountUsdCents * (appliedPromo.value / 100))
      : Math.min(appliedPromo.value, subtotalAfterItemDiscountUsdCents);

  const amountBeforeVatUsdCents = subtotalAfterItemDiscountUsdCents - promoDiscountUsdCents;
  const vatUsdCents = Math.round(amountBeforeVatUsdCents * (mockStore.vatPercent / 100));
  const totalUsdCents = amountBeforeVatUsdCents + vatUsdCents;
  const exchangeRate = getEffectiveExchangeRate(mockStore);
  const totalKhr = convertUsdCentsToKhr(totalUsdCents, exchangeRate);

  function handleQuantityChange(product: MockProduct, delta: number) {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[product.id] ?? 0) + delta);
      return { ...prev, [product.id]: next };
    });
  }

  function handleApplyPromo() {
    const match = mockPromoCodes.find(
      (promo) => promo.code.toLowerCase() === promoInput.trim().toLowerCase(),
    );
    if (!match) {
      setPromoError(t("promoInvalid"));
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
    <div className="relative mx-auto flex min-h-screen max-w-[480px] flex-col bg-bg text-fg">
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-border bg-bg/95 p-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
            {storeName.charAt(0)}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate font-semibold">{storeName}</span>
            {mockStore.verified && <Badge>{t("verified")}</Badge>}
          </div>
          <SegmentedControl
            value={locale}
            onChange={(next) => router.push(`/${next}/mockup/storefront`)}
            options={[
              { value: "km", label: "ខ្មែរ" },
              { value: "en", label: "EN" },
            ]}
          />
        </div>

        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          <CategoryChip active={selectedCategory === "all"} onClick={() => setSelectedCategory("all")}>
            {t("categoryAll")}
          </CategoryChip>
          {mockCategories.map((category) => (
            <CategoryChip
              key={category.id}
              active={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
            >
              {locale === "km" ? category.labelKm : category.labelEn}
            </CategoryChip>
          ))}
        </div>
      </header>

      <main className="grid flex-1 auto-rows-min grid-cols-2 gap-3 p-4 pb-40">
        {visibleProducts.map((product) => {
          const title = locale === "km" ? product.titleKm : product.titleEn;
          const qty = quantities[product.id] ?? 0;
          const unitUsdCents = getDiscountedUsdCents(product);
          const unitKhr = getDiscountedKhr(product);

          return (
            <Card key={product.id} className="flex flex-col gap-2 p-2">
              <div className="relative">
                <div className={`aspect-square w-full rounded-DEFAULT ${product.photoColor}`} />
                {product.discountPercent && (
                  <DiscountBadge percent={product.discountPercent} className="absolute left-1 top-1" />
                )}
                {qty === 0 && (
                  <button
                    type="button"
                    aria-label={t("add")}
                    onClick={() => handleQuantityChange(product, 1)}
                    className="absolute bottom-1 right-1 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white shadow-md transition-transform active:scale-95"
                  >
                    +
                  </button>
                )}
              </div>
              <span className="line-clamp-2 text-sm font-medium leading-snug">{title}</span>
              <PriceTag
                usdCents={unitUsdCents}
                khr={unitKhr}
                originalUsdCents={product.discountPercent ? product.priceUsdCents : undefined}
                originalKhr={product.discountPercent ? product.priceKhr : undefined}
                className="text-sm"
              />
              {qty > 0 && (
                <div className="flex items-center justify-between gap-2 rounded-full border border-brand bg-brand/5 p-1">
                  <button
                    type="button"
                    aria-label={t("decrease", { title })}
                    onClick={() => handleQuantityChange(product, -1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-bold text-white"
                  >
                    −
                  </button>
                  <span className="text-sm font-semibold">{qty}</span>
                  <button
                    type="button"
                    aria-label={t("increase", { title })}
                    onClick={() => handleQuantityChange(product, 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-bold text-white"
                  >
                    +
                  </button>
                </div>
              )}
            </Card>
          );
        })}
        {visibleProducts.length === 0 && (
          <p className="col-span-2 py-8 text-center text-sm text-muted">{t("noProducts")}</p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] flex-col gap-2 border-t border-border bg-bg p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        {cartCount === 0 ? (
          <span className="text-sm text-muted">{t("itemCount", { count: 0 })}</span>
        ) : (
          <>
            {!appliedPromo && !showPromoInput && (
              <button
                type="button"
                onClick={() => setShowPromoInput(true)}
                className="min-h-touch text-left text-sm font-medium text-brand"
              >
                {t("havePromoCode")}
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
                  placeholder={t("promoPlaceholder")}
                  className="min-h-touch flex-1 rounded-DEFAULT border border-border bg-bg px-3 text-sm uppercase text-fg placeholder:normal-case placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <Button variant="secondary" onClick={handleApplyPromo} className="px-4 text-sm">
                  {t("apply")}
                </Button>
              </div>
            )}
            {promoError && <p className="text-xs text-danger">{promoError}</p>}
            {appliedPromo && (
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-success">
                  {t("promoApplied", { code: appliedPromo.code })}
                </span>
                <button type="button" onClick={handleRemovePromo} className="text-xs text-muted underline">
                  {t("remove")}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-1 border-t border-border pt-2 text-sm">
              <div className="flex items-center justify-between text-muted">
                <span>{t("subtotal")}</span>
                <span>{formatUsd(originalSubtotalUsdCents)}</span>
              </div>
              {itemDiscountUsdCents > 0 && (
                <div className="flex items-center justify-between text-success">
                  <span>{t("itemDiscount")}</span>
                  <span>-{formatUsd(itemDiscountUsdCents)}</span>
                </div>
              )}
              {promoDiscountUsdCents > 0 && (
                <div className="flex items-center justify-between text-success">
                  <span>{t("promoDiscount")}</span>
                  <span>-{formatUsd(promoDiscountUsdCents)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-muted">
                <span>{t("vat", { percent: mockStore.vatPercent })}</span>
                <span>{formatUsd(vatUsdCents)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-1">
                <span className="font-semibold text-fg">{t("totalToPay")}</span>
                <span className="text-right">
                  <span className="block font-semibold text-fg">{formatUsd(totalUsdCents)}</span>
                  <span className="block text-xs text-muted">{formatKhr(totalKhr)}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted">{t("itemCount", { count: cartCount })}</span>
              <Button variant="primary" className="min-w-[140px]">
                {t("viewCart")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
