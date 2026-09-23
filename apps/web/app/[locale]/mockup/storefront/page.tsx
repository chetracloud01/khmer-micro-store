"use client";

import { formatUsd } from "@khmer-micro-store/shared";
import { Badge, BottomSheet, Button, SearchInput, SegmentedControl } from "@khmer-micro-store/ui";
import { ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  getStoreMaxDiscountPercent,
  getUnitKhr,
  getUnitUsdCents,
  lineKey,
  mockCategories,
  mockProducts,
  mockStore,
  type MockProduct,
} from "@/mock/mock-data";
import { useCart } from "../cart-context";
import { useCartSummary } from "../use-cart-summary";
import { CategoryChip, ProductCard, VariantRow } from "../shared-ui";

export default function StorefrontMockupPage() {
  const t = useTranslations("Storefront");
  const locale = useLocale();
  const router = useRouter();
  const { quantities, setQuantities } = useCart();
  const storeName = locale === "km" ? mockStore.nameKm : mockStore.nameEn;
  const ratingCountLabel = locale === "km" ? mockStore.ratingCountLabelKm : mockStore.ratingCountLabelEn;

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [pickerProductId, setPickerProductId] = useState<string | null>(null);

  const maxDiscount = getStoreMaxDiscountPercent(mockProducts);
  const specialOfferProducts = mockProducts.filter((product) => (product.discountPercent ?? 0) > 0);
  const showSpecialOffers = selectedCategory === "all" && !searchQuery && specialOfferProducts.length > 0;

  const visibleProducts = useMemo(() => {
    return mockProducts.filter((product) => {
      const inCategory = selectedCategory === "all" || product.categoryId === selectedCategory;
      const title = locale === "km" ? product.titleKm : product.titleEn;
      const matchesSearch = title.toLowerCase().includes(searchQuery.trim().toLowerCase());
      return inCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery, locale]);

  const { cartCount, totalUsdCents } = useCartSummary(quantities, locale, null);

  function adjustQuantity(key: string, delta: number) {
    setQuantities((prev) => {
      const next = Math.max(0, (prev[key] ?? 0) + delta);
      return { ...prev, [key]: next };
    });
  }

  function openPicker(product: MockProduct) {
    setPickerProductId(product.id);
  }

  function closePicker() {
    setPickerProductId(null);
  }

  const pickerProduct = pickerProductId ? (mockProducts.find((p) => p.id === pickerProductId) ?? null) : null;

  const cardProps = {
    locale,
    quantities,
    onAdjustQuantity: adjustQuantity,
    onOpenPicker: openPicker,
    addLabel: t("add"),
    startingFromLabel: t("startingFrom"),
    decreaseLabelFor: (title: string) => t("decrease", { title }),
    increaseLabelFor: (title: string) => t("increase", { title }),
  };

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[480px] flex-col bg-bg pb-24 text-fg">
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur">
        <div className="relative">
          <div className={`h-32 w-full ${mockStore.bannerColor}`} />
          {maxDiscount > 0 && (
            <div className="absolute inset-x-0 top-6 text-center">
              <span className="text-2xl font-extrabold text-white drop-shadow-md">
                {t("upTo", { percent: maxDiscount })}
              </span>
            </div>
          )}
          <div className="absolute -bottom-6 left-4 flex h-14 w-14 items-center justify-center rounded-full border-4 border-bg bg-brand text-xl font-bold text-white shadow-md">
            {storeName.charAt(0)}
          </div>
        </div>

        <div className="flex flex-col gap-3 px-4 pb-3 pt-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-semibold">{storeName}</span>
              <div className="flex items-center gap-2 text-xs text-muted">
                {mockStore.verified && <Badge>{t("verified")}</Badge>}
                <span>{t("rating", { value: mockStore.ratingValue, count: ratingCountLabel })}</span>
              </div>
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
        </div>
      </header>

      {showSpecialOffers && (
        <section className="flex flex-col gap-2 border-b border-border p-4">
          <h2 className="text-sm font-semibold text-fg">{t("specialOffers")}</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {specialOfferProducts.map((product) => (
              <ProductCard key={product.id} product={product} className="w-36 shrink-0" {...cardProps} />
            ))}
          </div>
        </section>
      )}

      <main className="grid flex-1 auto-rows-min grid-cols-2 gap-3 p-4">
        {visibleProducts.map((product) => (
          <ProductCard key={product.id} product={product} {...cardProps} />
        ))}
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
          <div className="flex flex-col gap-3">
            <div className={`aspect-video w-full rounded-DEFAULT ${pickerProduct.photoColor}`} />
            <p className="text-sm font-medium text-muted">{t("chooseOption")}</p>
            <div>
              {pickerProduct.variants!.map((variant) => {
                const key = lineKey(pickerProduct.id, variant.id);
                const qty = quantities[key] ?? 0;
                const label = locale === "km" ? variant.labelKm : variant.labelEn;
                return (
                  <VariantRow
                    key={variant.id}
                    label={label}
                    usdCents={getUnitUsdCents(pickerProduct, variant)}
                    khr={getUnitKhr(pickerProduct, variant)}
                    originalUsdCents={pickerProduct.discountPercent ? variant.priceUsdCents : undefined}
                    originalKhr={pickerProduct.discountPercent ? variant.priceKhr : undefined}
                    qty={qty}
                    onDecrease={() => adjustQuantity(key, -1)}
                    onIncrease={() => adjustQuantity(key, 1)}
                    addLabel={t("add")}
                    decreaseLabel={t("decrease", { title: label })}
                    increaseLabel={t("increase", { title: label })}
                  />
                );
              })}
            </div>
            <Button variant="primary" onClick={closePicker} className="w-full">
              {t("done")}
            </Button>
          </div>
        </BottomSheet>
      )}

      {cartCount > 0 && (
        <Link
          href={`/${locale}/mockup/cart`}
          className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] min-h-touch items-center justify-between gap-3 bg-brand p-3 text-white shadow-[0_-2px_8px_rgba(0,0,0,0.15)]"
        >
          <span className="flex flex-col items-start">
            <span className="text-xs opacity-90">{t("itemCount", { count: cartCount })}</span>
            <span className="text-base font-semibold">{formatUsd(totalUsdCents)}</span>
          </span>
          <span className="flex items-center gap-1 text-sm font-medium">
            {t("viewCart")}
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </Link>
      )}
    </div>
  );
}
