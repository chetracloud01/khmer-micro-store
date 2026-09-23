import { Badge, Button, Card, PriceTag } from "@khmer-micro-store/ui";
import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { mockProducts, mockStore } from "@/mock/mock-data";

// Mock cart state; the real cart wires up once this screen is approved.
const MOCK_CART_ITEM_COUNT = 2;
const MOCK_CART_SUBTOTAL_USD_CENTS = 350;

export default async function StorefrontMockupPage() {
  const t = await getTranslations("Storefront");
  const locale = await getLocale();
  const storeName = locale === "km" ? mockStore.nameKm : mockStore.nameEn;

  return (
    <div className="relative mx-auto flex min-h-screen max-w-[480px] flex-col bg-bg text-fg">
      <header className="flex items-center gap-3 border-b border-border p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
          {storeName.charAt(0)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-semibold">{storeName}</span>
          {mockStore.verified && <Badge>{t("verified")}</Badge>}
        </div>
        <nav className="flex shrink-0 items-center gap-2 text-sm font-medium">
          <Link
            href="/km/mockup/storefront"
            className={locale === "km" ? "text-brand" : "text-muted"}
          >
            ខ្មែរ
          </Link>
          <span className="text-muted">/</span>
          <Link
            href="/en/mockup/storefront"
            className={locale === "en" ? "text-brand" : "text-muted"}
          >
            EN
          </Link>
        </nav>
      </header>

      <main className="grid flex-1 grid-cols-2 gap-3 p-4 pb-28">
        {mockProducts.map((product) => {
          const title = locale === "km" ? product.titleKm : product.titleEn;
          return (
            <Card key={product.id} className="flex flex-col gap-2 p-2">
              <div className={`aspect-square w-full rounded-DEFAULT ${product.photoColor}`} />
              <span className="line-clamp-2 text-sm font-medium leading-snug">{title}</span>
              <PriceTag
                usdCents={product.priceUsdCents}
                khr={product.priceKhr}
                className="text-sm"
              />
            </Card>
          );
        })}
      </main>

      <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] items-center justify-between gap-3 border-t border-border bg-bg p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col">
          <span className="text-xs text-muted">{t("itemCount", { count: MOCK_CART_ITEM_COUNT })}</span>
          <PriceTag usdCents={MOCK_CART_SUBTOTAL_USD_CENTS} className="text-base" />
        </div>
        <Button variant="primary" className="min-w-[140px]">
          {t("viewCart")}
        </Button>
      </div>
    </div>
  );
}
