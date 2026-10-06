import type {
  BusinessType,
  Currency,
  DeliveryArea,
  DeliverySettings,
  FormErrorCode,
  Fulfilment,
  OrderCancelReason,
  OrderStatus,
  PaymentMethod,
  PlanId,
  SellerOrderAction,
  SubscriptionStatus,
} from "@khmio/shared";

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
  /** signedInWithTelegram: new-order alerts reach the merchant's own chat with the bot. */
  merchant: { firstName: string; lastName: string; telegramUsername: string | null; signedInWithTelegram: boolean };
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
/** One photo, and optionally its small copy for lists (made in the browser, about 400 px). */
export function uploadPhoto(photo: Blob, thumb?: Blob): Promise<UploadedPhoto> {
  const form = new FormData();
  form.append("file", photo, "photo.jpg");
  if (thumb) form.append("thumb", thumb, "thumb.jpg");
  return api<UploadedPhoto>("/uploads/photo", { method: "POST", form });
}

export interface UploadedPhoto {
  key: string;
  url: string;
  /** The ~400 px copy for lists; null or missing when there isn't one (PhotoThumb then shows the photo). */
  thumbUrl?: string | null;
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
  /** The last checklist step: the shop link was shared. */
  linkShared: boolean;
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
    allowCod: boolean;
    vatPercent: number;
  };
  categories: CatalogName[];
  products: Product[];
  /** Zones, pickup and provinces — never the drivers. */
  delivery: Omit<DeliverySettings, "drivers">;
  /** Orders need delivery saved at least once; KHQR joins in step 5. */
  ordering: { deliveryConfigured: boolean; khqrReady: boolean };
  /** false = the shop is paused: "temporarily closed", no orders. */
  open: boolean;
}

/** GET/PUT /delivery. */
export interface DeliveryResponse {
  settings: DeliverySettings;
  /** Saved at least once (the setup checklist's "delivery" step). */
  configured: boolean;
}

/** GET/PUT /store/settings. */
export interface StoreSettingsResponse {
  defaultCurrency: Currency;
  usdToKhrRate: number;
  allowCod: boolean;
  vatPercent: number;
  /** The USD to KHR band the platform allows today. */
  rateBand: { min: number; max: number };
}

/** POST /public/stores/:slug/orders. */
export interface PlacedOrder {
  token: string;
  orderNumber: number;
}

/** GET /public/orders/:token: the buyer's order page. */
export interface PublicOrder {
  orderNumber: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  currency: Currency;
  subtotalMinor: number;
  discountMinor: number;
  deliveryFeeMinor: number;
  vatPercent: number;
  vatMinor: number;
  totalMinor: number;
  exchangeRateUsed: number;
  fulfilment: Fulfilment;
  area: DeliveryArea;
  districtId: string | null;
  provinceId: string | null;
  landmark: string;
  pickupAddress: string;
  pickupHours: string;
  buyerName: string;
  cancelReason: OrderCancelReason | null;
  createdAt: string;
  items: { titleKm: string; titleEn: string; variantLabelKm: string; variantLabelEn: string; unitPriceMinor: number; quantity: number; lineTotalMinor: number }[];
  events: { status: OrderStatus; at: string }[];
  /** How it was sent: the driver's name or the bus ticket (never the driver's phone). */
  dispatch: { route: "driver" | "bus" | "pickup"; driverName: string; busCompany: string; ticketNumber: string; dispatchedAt: string } | null;
  /** The buyer may cancel by themselves right now (packages/shared canBuyerCancel). */
  canCancel: boolean;
  /** A Telegram chat follows this order's status. */
  followingOnTelegram: boolean;
  store: { slug: string; name: string; phone: string; logoUrl: string | null };
}

/** GET /orders: one row of the seller's order list. */
export interface SellerOrder {
  id: string;
  orderNumber: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  currency: Currency;
  totalMinor: number;
  buyerName: string;
  buyerPhone: string;
  fulfilment: Fulfilment;
  area: DeliveryArea;
  districtId: string | null;
  provinceId: string | null;
  createdAt: string;
  itemCount: number;
}

/** GET /orders/:id and POST /orders/:id/actions: one order in full, for the seller. */
export interface SellerOrderDetail extends Omit<PublicOrder, "store" | "events" | "dispatch" | "canCancel" | "followingOnTelegram"> {
  id: string;
  buyerPhone: string;
  cancelNote: string;
  events: { status: OrderStatus; actor: "buyer" | "merchant" | "system"; at: string }[];
  dispatches: {
    route: "driver" | "bus" | "pickup";
    driverName: string;
    driverPhone: string;
    busCompany: string;
    ticketNumber: string;
    dispatchedAt: string;
    pickedUpAt: string | null;
    deliveredAt: string | null;
    failedAt: string | null;
  }[];
  /** What the seller may do now (packages/shared getSellerActions), the main step first. */
  actions: SellerOrderAction[];
  /** How it must be sent (packages/shared getDispatchRoute). */
  route: "driver" | "bus" | "pickup";
}

/** POST /store/telegram-groups/link and /public/orders/:token/telegram-link: a one-time t.me link (15 minutes). */
export interface TelegramLink {
  link: string;
  expiresAt: string;
}

/** GET /store/telegram-groups. */
export interface StaffGroup {
  id: string;
  title: string;
  createdAt: string;
}
