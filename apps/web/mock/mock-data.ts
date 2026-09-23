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
}

export interface MockCategory {
  id: string;
  labelKm: string;
  labelEn: string;
}

export interface MockProduct {
  id: string;
  categoryId: string;
  titleKm: string;
  titleEn: string;
  photoColor: string;
  priceUsdCents?: number;
  priceKhr?: number;
}

export const mockCategories: MockCategory[] = [
  { id: "drinks", labelKm: "ភេសជ្ជៈ", labelEn: "Drinks" },
  { id: "bakery", labelKm: "នំបុ័ង", labelEn: "Bakery" },
];

export const mockStore: MockStore = {
  slug: "sokha-coffee",
  nameKm: "កាហ្វេសុខា",
  nameEn: "Sokha Coffee",
  verified: true,
  defaultCurrency: "USD",
};

export const mockProducts: MockProduct[] = [
  {
    id: "p1",
    categoryId: "drinks",
    titleKm: "កាហ្វេទឹកកក",
    titleEn: "Iced Coffee",
    photoColor: "bg-amber-200",
    priceUsdCents: 150,
    priceKhr: 6150,
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
