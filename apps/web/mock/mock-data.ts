// Mock data for screens built under app/[locale]/mockup/. Real data comes
// from the API once a screen is approved and connected (see CLAUDE.md
// workflow). Product titles are catalog data, not UI copy, so they live
// here rather than in messages/*.json.

export interface MockStore {
  slug: string;
  nameKm: string;
  nameEn: string;
  verified: boolean;
  defaultCurrency: "USD" | "KHR";
  /** Seller-configured USD->KHR rate, clamped to [usdToKhrRateMin, usdToKhrRateMax]. */
  usdToKhrRate: number;
  usdToKhrRateMin: number;
  usdToKhrRateMax: number;
  vatPercent: number;
}

export interface MockCategory {
  id: string;
  labelKm: string;
  labelEn: string;
}

/**
 * A sellable variant (SKU) of a product — e.g. Size S/M/L, a colour, or any
 * other seller-defined option. The label is free text set by the seller, so
 * this works the same way for a coffee shop's cup sizes as it would for a
 * clothing seller's sizes/colours or any other merchant's option list.
 */
export interface MockVariant {
  id: string;
  sku: string;
  labelKm: string;
  labelEn: string;
  priceUsdCents?: number;
  priceKhr?: number;
  stockQuantity: number;
}

export interface MockProduct {
  id: string;
  categoryId: string;
  titleKm: string;
  titleEn: string;
  photoColor: string;
  /** Used only when the product has no variants. */
  priceUsdCents?: number;
  priceKhr?: number;
  /** Merchant-set discount from master data; applied automatically, no promo code needed. */
  discountPercent?: number;
  /** When set, the buyer must pick one before adding to cart; each variant has its own price/SKU. */
  variants?: MockVariant[];
}

export type MockPromoType = "percent" | "fixed";

export interface MockPromoCode {
  code: string;
  type: MockPromoType;
  /** Percent (0-100) if type is "percent", or USD cents off if type is "fixed". */
  value: number;
}

export const mockCategories: MockCategory[] = [
  { id: "drinks", labelKm: "ភេសជ្ជៈ", labelEn: "Drinks" },
  { id: "bakery", labelKm: "នំបុ័ង", labelEn: "Bakery" },
];

export const mockPromoCodes: MockPromoCode[] = [
  { code: "SAVE10", type: "percent", value: 10 },
  { code: "WELCOME1", type: "fixed", value: 100 },
];

/** Unit price after the product's master-data discount, for the product itself or one of its variants. */
export function getUnitUsdCents(product: MockProduct, variant?: MockVariant): number | undefined {
  const base = variant ? variant.priceUsdCents : product.priceUsdCents;
  if (base == null) return undefined;
  if (!product.discountPercent) return base;
  return Math.round(base * (1 - product.discountPercent / 100));
}

export function getUnitKhr(product: MockProduct, variant?: MockVariant): number | undefined {
  const base = variant ? variant.priceKhr : product.priceKhr;
  if (base == null) return undefined;
  if (!product.discountPercent) return base;
  return Math.round(base * (1 - product.discountPercent / 100));
}

/** The cheapest variant, for the grid card's "From $X" price. Real code would
 * pick the cheapest in the buyer's selected currency; this mock assumes every
 * variant has a USD price. */
export function getStartingVariant(product: MockProduct): MockVariant | undefined {
  if (!product.variants?.length) return undefined;
  return product.variants.reduce((cheapest, variant) =>
    (variant.priceUsdCents ?? Infinity) < (cheapest.priceUsdCents ?? Infinity) ? variant : cheapest,
  );
}

/** The rate actually used for KHR conversion, clamped to the seller's allowed band. */
export function getEffectiveExchangeRate(store: MockStore): number {
  return Math.min(store.usdToKhrRateMax, Math.max(store.usdToKhrRateMin, store.usdToKhrRate));
}

export const mockStore: MockStore = {
  slug: "sokha-coffee",
  nameKm: "កាហ្វេសុខា",
  nameEn: "Sokha Coffee",
  verified: true,
  defaultCurrency: "USD",
  usdToKhrRate: 4100,
  usdToKhrRateMin: 3900,
  usdToKhrRateMax: 4300,
  vatPercent: 10,
};

export const mockProducts: MockProduct[] = [
  {
    id: "p1",
    categoryId: "drinks",
    titleKm: "កាហ្វេទឹកកក",
    titleEn: "Iced Coffee",
    photoColor: "bg-amber-200",
    discountPercent: 15,
    variants: [
      { id: "p1-s", sku: "ICE-COF-S", labelKm: "តូច", labelEn: "Small", priceUsdCents: 125, priceKhr: 5125, stockQuantity: 20 },
      { id: "p1-m", sku: "ICE-COF-M", labelKm: "មធ្យម", labelEn: "Medium", priceUsdCents: 150, priceKhr: 6150, stockQuantity: 20 },
      { id: "p1-l", sku: "ICE-COF-L", labelKm: "ធំ", labelEn: "Large", priceUsdCents: 175, priceKhr: 7150, stockQuantity: 15 },
    ],
  },
  {
    id: "p2",
    categoryId: "drinks",
    titleKm: "កាហ្វេទឹកដោះគោ",
    titleEn: "Iced Latte",
    photoColor: "bg-amber-300",
    priceUsdCents: 200,
    priceKhr: 8200,
  },
  {
    id: "p3",
    categoryId: "drinks",
    titleKm: "តែទឹកដោះគោ",
    titleEn: "Milk Tea",
    photoColor: "bg-orange-200",
    priceUsdCents: 175,
    priceKhr: 7150,
  },
  {
    id: "p4",
    categoryId: "bakery",
    titleKm: "ខូគីសូកូឡា",
    titleEn: "Chocolate Cookie",
    photoColor: "bg-yellow-800/30",
    priceUsdCents: 100,
  },
  {
    id: "p5",
    categoryId: "bakery",
    titleKm: "ក្រូឆ្សង់",
    titleEn: "Croissant",
    photoColor: "bg-yellow-200",
    priceUsdCents: 125,
    priceKhr: 5150,
    discountPercent: 10,
  },
  {
    id: "p6",
    categoryId: "drinks",
    titleKm: "ទឹកម្សៅម្រះ",
    titleEn: "Lemonade",
    photoColor: "bg-lime-200",
    priceKhr: 6000,
  },
];
