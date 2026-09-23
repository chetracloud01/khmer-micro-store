"use client";

import { convertUsdCentsToKhr, formatKhr, formatUsd } from "@khmer-micro-store/shared";
import {
  Badge,
  BottomSheet,
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
  getStartingVariant,
  getUnitKhr,
  getUnitUsdCents,
  getEffectiveExchangeRate,
  mockCategories,
  mockPromoCodes,
  mockProducts,
  mockStore,
  type MockProduct,
  type MockVariant,
} from "@/mock/mock-data";

/** `${productId}::${variantId}`, or `${productId}::_base` for a product with no variants. */
function lineKey(productId: string, variantId?: string) {
  return `${productId}::${variantId ?? "_base"}`;
}

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

function Stepper({
  qty,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  className,
}: {
  qty: number;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-full border border-brand bg-brand/5 p-1", className)}>
      <button
        type="button"
        aria-label={decreaseLabel}
        onClick={onDecrease}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-bold text-white"
      >
        −
      </button>
      <span className="text-sm font-semibold">{qty}</span>
      <button
        type="button"
        aria-label={increaseLabel}
        onClick={onIncrease}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-bold text-white"
      >
        +
      </button>
    </div>
  );
}

// Every priceable line in the catalog: a variant, or the product itself if it has none.
function getAllLineContexts() {
  return mockProducts.flatMap((product) => {
    if (product.variants?.length) {
      return product.variants.map((variant) => ({
        key: lineKey(product.id, variant.id),
        baseUsdCents: variant.priceUsdCents,
        unitUsdCents: getUnitUsdCents(product, variant),
      }));
    }
    return [
      {
        key: lineKey(product.id),
        baseUsdCents: product.priceUsdCents,
        unitUsdCents: getUnitUsdCents(product),
      },
    ];
  });
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

  const [pickerProductId, setPickerProductId] = useState<string | null>(null);
  const [pickerVariantId, setPickerVariantId] = useState<string | null>(null);
  const [pickerQty, setPickerQty] = useState(1);

  const visibleProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      const inCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
      const title = locale === "km" ? product.titleKm : product.titleEn;
      const matchesSearch = title.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return inCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, locale]);

  const cartCount = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

  const lineContexts = getAllLineContexts();
  const originalSubtotalUsdCents = lineContexts.reduce((sum, ctx) => {
    const qty = quantities[ctx.key] ?? 0;
    return ctx.baseUsdCents != null ? sum + ctx.baseUsdCents * qty : sum;
  }, 0);
  const subtotalAfterItemDiscountUsdCents = lineContexts.reduce((sum, ctx) => {
    const qty = quantities[ctx.key] ?? 0;
    return ctx.unitUsdCents != null ? sum + ctx.unitUsdCents * qty : sum;
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

  function getProductCartCount(product: MockProduct): number {
    if (product.variants?.length) {
      return product.variants.reduce((sum, variant) => sum + (quantities[lineKey(product.id, variant.id)] ?? 0), 0);
    }
    return quantities[lineKey(product.id)] ?? 0;
  }

  function adjustQuantity(key: string, delta: number) {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[key] ?? 0) + delta);
      return { ...prev, [key]: next };
    });
  }

  function openPicker(product: MockProduct) {
    setPickerProductId(product.id);
    setPickerVariantId(product.variants?.[0]?.id ?? null);
    setPickerQty(1);
  }

  function closePicker() {
    setPickerProductId(null);
    setPickerVariantId(null);
  }

  const pickerProduct = pickerProductId ? (mockProducts.find((p) => p.id === pickerProductId) ?? null) : null;
  const pickerVariant: MockVariant | undefined = pickerProduct?.variants?.find((v) => v.id === pickerVariantId);

  function confirmPicker() {
    if (!pickerProduct || !pickerVariant) return;
    adjustQuantity(lineKey(pickerProduct.id, pickerVariant.id), pickerQty);
    closePicker();
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
          const hasVariants = !!product.variants?.length;
          const startingVariant = getStartingVariant(product);
          const displayUnitUsd = hasVariants ? getUnitUsdCents(product, startingVariant) : getUnitUsdCents(product);
          const displayUnitKhr = hasVariants ? getUnitKhr(product, startingVariant) : getUnitKhr(product);
          const displayOriginalUsd = product.discountPercent
            ? (hasVariants ? startingVariant?.priceUsdCents : product.priceUsdCents)
            : undefined;
          const displayOriginalKhr = product.discountPercent
            ? (hasVariants ? startingVariant?.priceKhr : product.priceKhr)
            : undefined;

          const productCartCount = getProductCartCount(product);
          const baseKey = lineKey(product.id);
          const baseQty = hasVariants ? 0 : (quantities[baseKey] ?? 0);

          return (
            <Card key={product.id} className="flex flex-col gap-2 p-2">
              <div className="relative">
                <div className={`aspect-square w-full rounded-DEFAULT ${product.photoColor}`} />
                {product.discountPercent && (
                  <DiscountBadge percent={product.discountPercent} className="absolute left-1 top-1" />
                )}
                {hasVariants && productCartCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-white">
                    {productCartCount}
                  </span>
                )}
                {(hasVariants || baseQty === 0) && (
                  <button
                    type="button"
                    aria-label={t("add")}
                    onClick={() => (hasVariants ? openPicker(product) : adjustQuantity(baseKey, 1))}
                    className="absolute bottom-1 right-1 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white shadow-md transition-transform active:scale-95"
                  >
                    +
                  </button>
                )}
              </div>
              <span className="line-clamp-2 text-sm font-medium leading-snug">{title}</span>
              <div className="flex items-center gap-1">
                {hasVariants && <span className="text-xs text-muted">{t("startingFrom")}</span>}
                <PriceTag
                  usdCents={displayUnitUsd}
                  khr={displayUnitKhr}
                  originalUsdCents={displayOriginalUsd}
                  originalKhr={displayOriginalKhr}
                  className="text-sm"
                />
              </div>
              {!hasVariants && baseQty > 0 && (
                <Stepper
                  qty={baseQty}
                  onDecrease={() => adjustQuantity(baseKey, -1)}
                  onIncrease={() => adjustQuantity(baseKey, 1)}
                  decreaseLabel={t("decrease", { title })}
                  increaseLabel={t("increase", { title })}
                />
              )}
            </Card>
          );
        })}
        {visibleProducts.length === 0 && (
          <p className="col-span-2 py-8 text-center text-sm text-muted">{t("noProducts")}</p>
        )}
      </main>

      {pickerProduct && (
        <BottomSheet
          open
          onClose={closePicker}
          closeLabel={t("close")}
          title={locale === "km" ? pickerProduct.titleKm : pickerProduct.titleEn}
        >
          <div className="flex flex-col gap-4">
            <div className={`aspect-video w-full rounded-DEFAULT ${pickerProduct.photoColor}`} />
            <div>
              <p className="mb-2 text-sm font-medium text-muted">{t("chooseOption")}</p>
              <div className="flex flex-wrap gap-2">
                {pickerProduct.variants!.map((variant) => (
                  <CategoryChip
                    key={variant.id}
                    active={pickerVariantId === variant.id}
                    onClick={() => setPickerVariantId(variant.id)}
                  >
                    {locale === "km" ? variant.labelKm : variant.labelEn}
                  </CategoryChip>
                ))}
              </div>
            </div>
            {pickerVariant && (
              <PriceTag
                usdCents={getUnitUsdCents(pickerProduct, pickerVariant)}
                khr={getUnitKhr(pickerProduct, pickerVariant)}
                originalUsdCents={pickerProduct.discountPercent ? pickerVariant.priceUsdCents : undefined}
                originalKhr={pickerProduct.discountPercent ? pickerVariant.priceKhr : undefined}
                className="text-lg"
              />
            )}
            <Stepper
              qty={pickerQty}
              onDecrease={() => setPickerQty((q) => Math.max(1, q - 1))}
              onIncrease={() => setPickerQty((q) => q + 1)}
              decreaseLabel={t("decrease", { title: pickerProduct.titleEn })}
              increaseLabel={t("increase", { title: pickerProduct.titleEn })}
              className="w-32"
            />
            <Button variant="primary" onClick={confirmPicker} className="w-full">
              {t("addToCart")}
            </Button>
          </div>
        </BottomSheet>
      )}

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
