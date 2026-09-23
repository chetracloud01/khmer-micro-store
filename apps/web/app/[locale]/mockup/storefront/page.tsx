"use client";

import { Badge, Button, Card, cn, PriceTag, SegmentedControl } from "@khmer-micro-store/ui";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import { mockCategories, mockProducts, mockStore, type MockProduct } from "@/mock/mock-data";

// Mock cart state; the real cart wires up once this screen is approved.
const INITIAL_CART_ITEM_COUNT = 2;
const INITIAL_CART_SUBTOTAL_USD_CENTS = 350;

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
  const [cartCount, setCartCount] = useState(INITIAL_CART_ITEM_COUNT);
  const [cartUsdCents, setCartUsdCents] = useState(INITIAL_CART_SUBTOTAL_USD_CENTS);

  const filteredProducts =
    selectedCategory === "all"
      ? mockProducts
      : mockProducts.filter((product) => product.categoryId === selectedCategory);

  function handleQuickAdd(product: MockProduct) {
    setCartCount((count) => count + 1);
    if (product.priceUsdCents != null) {
      setCartUsdCents((cents) => cents + product.priceUsdCents!);
    }
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

      <main className="grid flex-1 auto-rows-min grid-cols-2 gap-3 p-4 pb-28">
        {filteredProducts.map((product) => {
          const title = locale === "km" ? product.titleKm : product.titleEn;
          return (
            <Card key={product.id} className="flex flex-col gap-2 p-2">
              <div className="relative">
                <div className={`aspect-square w-full rounded-DEFAULT ${product.photoColor}`} />
                <button
                  type="button"
                  onClick={() => handleQuickAdd(product)}
                  aria-label={t("quickAdd", { title })}
                  className="absolute bottom-1 right-1 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-xl font-bold text-white shadow-md transition-transform active:scale-95"
                >
                  +
                </button>
              </div>
              <span className="line-clamp-2 text-sm font-medium leading-snug">{title}</span>
              <PriceTag usdCents={product.priceUsdCents} khr={product.priceKhr} className="text-sm" />
            </Card>
          );
        })}
        {filteredProducts.length === 0 && (
          <p className="col-span-2 py-8 text-center text-sm text-muted">{t("noProducts")}</p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] items-center justify-between gap-3 border-t border-border bg-bg p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col">
          <span className="text-xs text-muted">{t("itemCount", { count: cartCount })}</span>
          <PriceTag usdCents={cartUsdCents} className="text-base" />
        </div>
        <Button variant="primary" className="min-w-[140px]">
          {t("viewCart")}
        </Button>
      </div>
    </div>
  );
}
