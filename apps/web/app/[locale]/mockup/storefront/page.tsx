"use client";

import { formatUsd } from "@khmer-micro-store/shared";
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
  const subtotalUsdCents = mockProducts.reduce((sum, product) => {
    const qty = quantities[product.id] ?? 0;
    const unitPrice = getDiscountedUsdCents(product);
    return unitPrice != null ? sum + unitPrice * qty : sum;
  }, 0);

  const promoDiscountUsdCents = !appliedPromo
    ? 0
    : appliedPromo.type === "percent"
      ? Math.round(subtotalUsdCents * (appliedPromo.value / 100))
      : Math.min(appliedPromo.value, subtotalUsdCents);
  const finalTotalUsdCents = subtotalUsdCents - promoDiscountUsdCents;

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
              </div>
              <span className="line-clamp-2 text-sm font-medium leading-snug">{title}</span>
              <PriceTag
                usdCents={unitUsdCents}
                khr={unitKhr}
                originalUsdCents={product.discountPercent ? product.priceUsdCents : undefined}
                originalKhr={product.discountPercent ? product.priceKhr : undefined}
                className="text-sm"
              />
              {qty === 0 ? (
                <Button
                  variant="secondary"
                  className="min-h-touch w-full text-sm"
                  onClick={() => handleQuantityChange(product, 1)}
                >
                  {t("add")}
                </Button>
              ) : (
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
            <span className="font-medium text-success">{t("promoApplied", { code: appliedPromo.code })}</span>
            <button type="button" onClick={handleRemovePromo} className="text-xs text-muted underline">
              {t("remove")}
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted">{t("itemCount", { count: cartCount })}</span>
            <div className="flex items-baseline gap-2">
              {promoDiscountUsdCents > 0 && (
                <span className="text-xs text-muted line-through">{formatUsd(subtotalUsdCents)}</span>
              )}
              <PriceTag usdCents={finalTotalUsdCents} className="text-base" />
            </div>
          </div>
          <Button variant="primary" className="min-w-[140px]">
            {t("viewCart")}
          </Button>
        </div>
      </div>
    </div>
  );
}
