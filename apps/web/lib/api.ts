import type { BusinessType, Currency, DeliveryArea, FormErrorCode, PlanId, SubscriptionStatus } from "@khmer-micro-store/shared";

// The browser's way to the API (apps/api). The session lives in an HttpOnly
// cookie the API sets, so every call sends cookies; page scripts never see it.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

/** The API's one error shape (apps/api errors.ts). `status` 0 = the API couldn't be reached at all. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly fields: Partial<Record<string, FormErrorCode>> = {},
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export async function api<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; form?: FormData } = {},
): Promise<T> {
  let response: Response;
  const json = options.body !== undefined;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      credentials: "include",
      // A FormData body sets its own Content-Type (with the multipart boundary).
      headers: json ? { "Content-Type": "application/json" } : undefined,
      body: options.form ?? (json ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ApiError(0, "unreachable");
  }
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const body = (data ?? {}) as { error?: string; fields?: Partial<Record<string, FormErrorCode>> };
    throw new ApiError(response.status, body.error ?? "internal", body.fields ?? {});
  }
  return data as T;
}

export interface Me {
  merchant: { firstName: string; lastName: string; telegramUsername: string | null };
  store: {
    id: string;
    slug: string;
    name: string;
    businessType: BusinessType;
    phone: string;
    subscription: { plan: PlanId; status: SubscriptionStatus; trialEndsAt: string | null } | null;
  } | null;
}

/** null when nobody is signed in. */
export async function getMe(): Promise<Me | null> {
  try {
    return await api<Me>("/auth/me");
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

/** Sends one photo (already shrunk in the browser) and returns the key to save with the product or logo. */
export function uploadPhoto(photo: Blob): Promise<UploadedPhoto> {
  const form = new FormData();
  form.append("file", photo, "photo.jpg");
  return api<UploadedPhoto>("/uploads/photo", { method: "POST", form });
}

export interface UploadedPhoto {
  key: string;
  url: string;
}

export interface CatalogName {
  id: string;
  nameKm: string;
  nameEn: string;
}

/** GET /catalog: what the product form picks from. */
export interface Catalog {
  categories: CatalogName[];
  brands: CatalogName[];
  units: CatalogName[];
  defaultUnitId: string | null;
}

/** GET /store: the shop details page, the plan in force and the setup checklist's facts. */
export interface StoreDetails {
  slug: string;
  name: string;
  businessType: BusinessType;
  phone: string;
  area: DeliveryArea;
  description: string;
  logoKey: string | null;
  logoUrl: string | null;
  bakongId: string;
  usdToKhrRate: number;
  plan: PlanId;
  paused: boolean;
  readiness: { visibleProducts: number; productsWithPhoto: number; deliveryConfigured: boolean; khqrReady: boolean; codEnabled: boolean };
}

export interface ProductVariant {
  id: string;
  sku: string;
  labelKm: string;
  labelEn: string;
  priceUsdCents: number | null;
  priceKhr: number | null;
  /** Only on plans with wholesale prices. */
  wholesalePriceUsdCents?: number | null;
  wholesalePriceKhr?: number | null;
}

/** A product as GET /products and the shop page return it. */
export interface Product {
  id: string;
  titleKm: string;
  titleEn: string;
  descriptionKm: string;
  descriptionEn: string;
  categoryId: string;
  brandId: string | null;
  unitId: string | null;
  discountPercent: number | null;
  isVisible: boolean;
  photos: UploadedPhoto[];
  /** false = one hidden default variant carries the price. */
  hasOptions: boolean;
  variants: ProductVariant[];
}

/** GET /public/stores/:slug: everything the buyer's shop page shows. */
export interface PublicShop {
  store: {
    slug: string;
    name: string;
    businessType: BusinessType;
    phone: string;
    area: DeliveryArea;
    description: string;
    logoUrl: string | null;
    defaultCurrency: Currency;
    usdToKhrRate: number;
  };
  categories: CatalogName[];
  products: Product[];
}
