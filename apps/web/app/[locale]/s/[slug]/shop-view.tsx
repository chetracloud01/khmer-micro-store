"use client";

import { formatKhmerPhoneLocal } from "@khmer-micro-store/shared";
import { Button, Card, cn, DiscountBadge, PriceTag, SearchInput, SegmentedControl } from "@khmer-micro-store/ui";
import { ChevronLeft, ChevronRight, ImageOff, Phone, SearchX, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Product, PublicShop } from "@/lib/api";
import { discounted, startingVariant } from "@/lib/product-price";

// What a buyer sees at /s/<link>: the shop, its categories and its visible
// products, with a product's own page for photos, description and options.
// Read-only for now — the cart and checkout arrive with roadmap step 4.
export function ShopView({ shop }: { shop: PublicShop }) {
  const t = useTranslations("Storefront");
  const tApp = useTranslations("App");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { store, categories, products } = shop;
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Product | null>(null);

  const text = (km: string, en: string) => (locale === "km" ? km || en : en || km);
  // Only categories with something to buy get a chip.
  const shownCategories = categories.filter((entry) => products.some((product) => product.categoryId === entry.id));
  const shown = useMemo(() => {
    const words = query.trim().toLowerCase();
    // Both languages: a buyer may type "coffee" on the Khmer page.
    return products.filter(
      (product) => (category === "all" || product.categoryId === category) && `${product.titleKm} ${product.titleEn}`.toLowerCase().includes(words),
    );
  }, [products, category, query]);

  const logo = store.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- the shop's own uploaded logo
    <img src={store.logoUrl} alt="" className="h-full w-full object-cover" />
  ) : (
    store.name.charAt(0).toUpperCase()
  );

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1100px] flex-col bg-bg pb-16 md:border-x md:border-border">
        <header className="flex flex-col gap-3 border-b border-border p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand text-xl font-bold text-on-brand">{logo}</span>
              <div className="min-w-0">
                <h1 className="text-lg font-bold leading-normal">{store.name}</h1>
                {store.description && <p className="text-sm text-muted">{store.description}</p>}
              </div>
            </div>
            <SegmentedControl
              value={locale}
              onChange={(next) => router.replace(pathname.replace(/^\/(km|en)/, `/${next}`))}
              options={[
                { value: "km", label: "ខ្មែរ" },
                { value: "en", label: "EN" },
              ]}
            />
          </div>
          {/* Until checkout arrives (step 4), the phone is how a buyer orders. */}
          {store.phone && (
            <>
              <a href={`tel:+${store.phone}`} className="flex min-h-touch items-center gap-2 self-start text-sm font-medium text-brand">
                <Phone className="h-4 w-4" aria-hidden="true" />
                {t("callShop", { phone: formatKhmerPhoneLocal(store.phone) })}
              </a>
              <p className="rounded-DEFAULT bg-info/5 p-3 text-sm text-muted">{tApp("orderingSoon")}</p>
            </>
          )}
        </header>

        <div className="sticky top-0 z-20 flex flex-col gap-2 border-b border-border bg-bg py-2">
          <div className="px-4">
            <SearchInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClear={() => setQuery("")}
              clearLabel={t("clearSearch")}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
            />
          </div>
          {shownCategories.length > 1 && (
            <div className="no-scrollbar flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4">
              {[{ id: "all", label: t("categoryAll") }, ...shownCategories.map((entry) => ({ id: entry.id, label: text(entry.nameKm, entry.nameEn) }))].map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setCategory(chip.id)}
                  aria-pressed={category === chip.id}
                  className={cn(
                    "min-h-touch shrink-0 snap-start whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors",
                    category === chip.id ? "border-brand bg-brand text-on-brand" : "border-border bg-bg text-muted hover:text-fg",
                  )}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {shown.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((product) => (
              <ProductCard key={product.id} product={product} title={text(product.titleKm, product.titleEn)} rate={store.usdToKhrRate} currency={store.defaultCurrency} startingFromLabel={t("startingFrom")} onOpen={() => setOpen(product)} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-border/30">
              <SearchX className="h-7 w-7 text-muted" aria-hidden="true" />
            </span>
            <p className="text-sm text-muted">{query.trim() ? t("noResultsFor", { query: query.trim() }) : t("noProducts")}</p>
            {(query || category !== "all") && (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
              >
                {t("showAllProducts")}
              </Button>
            )}
          </div>
        )}
      </div>

      {open && <ProductSheet product={open} title={text(open.titleKm, open.titleEn)} description={text(open.descriptionKm, open.descriptionEn)} shop={shop} onClose={() => setOpen(null)} />}
    </div>
  );
}

function ProductCard({
  product,
  title,
  rate,
  currency,
  startingFromLabel,
  onOpen,
}: {
  product: Product;
  title: string;
  rate: number;
  currency: PublicShop["store"]["defaultCurrency"];
  startingFromLabel: string;
  onOpen: () => void;
}) {
  const variant = startingVariant(product, rate);
  return (
    <Card className="flex h-full flex-col gap-2 p-2">
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col gap-2 text-left">
        <span className="relative block">
          {product.photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element -- the seller's uploaded photo
            <img src={product.photos[0].url} alt="" loading="lazy" className="aspect-square w-full rounded-DEFAULT object-cover" />
          ) : (
            <span className="flex aspect-square w-full items-center justify-center rounded-DEFAULT bg-border/30">
              <ImageOff className="h-6 w-6 text-muted" aria-hidden="true" />
            </span>
          )}
          {product.discountPercent ? <DiscountBadge percent={product.discountPercent} className="absolute left-1 top-1" /> : null}
        </span>
        <span className="line-clamp-2 text-sm font-medium">{title}</span>
        {product.hasOptions && <span className="text-xs text-muted">{startingFromLabel}</span>}
        {variant && (
          <PriceTag
            primary={currency}
            usdCents={variant.priceUsdCents != null ? discounted(variant.priceUsdCents, product.discountPercent) : undefined}
            khr={variant.priceKhr != null ? discounted(variant.priceKhr, product.discountPercent) : undefined}
            originalUsdCents={product.discountPercent ? (variant.priceUsdCents ?? undefined) : undefined}
            originalKhr={product.discountPercent ? (variant.priceKhr ?? undefined) : undefined}
          />
        )}
      </button>
    </Card>
  );
}

/** The product's own page, as a sheet over the shop: photos, description and each option's price. */
function ProductSheet({ product, title, description, shop, onClose }: { product: Product; title: string; description: string; shop: PublicShop; onClose: () => void }) {
  const t = useTranslations("Storefront");
  const locale = useLocale();
  const [photo, setPhoto] = useState(0);
  const count = product.photos.length;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-fg/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-[560px] flex-col overflow-y-auto rounded-t-2xl bg-bg pb-safe sm:rounded-2xl"
      >
        <div className="relative">
          {count > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element -- the seller's uploaded photo
            <img src={product.photos[photo]?.url} alt="" className="aspect-square w-full object-cover sm:rounded-t-2xl" />
          ) : (
            <span className="flex aspect-[2/1] w-full items-center justify-center bg-border/30">
              <ImageOff className="h-8 w-8 text-muted" aria-hidden="true" />
            </span>
          )}
          <button type="button" onClick={onClose} aria-label={t("close")} className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-bg/85 shadow-card">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          {count > 1 && (
            <>
              <button type="button" onClick={() => setPhoto((photo + count - 1) % count)} aria-label={t("previousPhoto")} className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-bg/85 shadow-card">
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setPhoto((photo + 1) % count)} aria-label={t("nextPhoto")} className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-bg/85 shadow-card">
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-fg/70 px-2 py-0.5 text-xs text-bg">{t("photoPosition", { current: photo + 1, total: count })}</span>
            </>
          )}
        </div>
        <div className="flex flex-col gap-3 p-4">
          <h2 className="text-lg font-semibold leading-normal">{title}</h2>
          {description && <p className="whitespace-pre-line text-sm text-muted">{description}</p>}
          <ul className="flex flex-col gap-2">
            {product.variants.map((variant) => (
              <li key={variant.id} className="flex min-h-touch items-center justify-between gap-3 rounded-DEFAULT border border-border px-3 py-2">
                <span className="text-sm font-medium">{product.hasOptions ? (locale === "km" ? variant.labelKm || variant.labelEn : variant.labelEn || variant.labelKm) : title}</span>
                <PriceTag
                  primary={shop.store.defaultCurrency}
                  usdCents={variant.priceUsdCents != null ? discounted(variant.priceUsdCents, product.discountPercent) : undefined}
                  khr={variant.priceKhr != null ? discounted(variant.priceKhr, product.discountPercent) : undefined}
                  originalUsdCents={product.discountPercent ? (variant.priceUsdCents ?? undefined) : undefined}
                  originalKhr={product.discountPercent ? (variant.priceKhr ?? undefined) : undefined}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
