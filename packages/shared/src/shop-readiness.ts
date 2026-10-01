// What a shop needs before the seller shares its link with buyers. A new
// seller can open a shop in two questions (docs/blueprint.md "Merchant
// onboarding"), but a buyer who follows the link must find something to buy,
// a way to reach the shop, a way to get it delivered and a way to pay. The
// dashboard checklist, the "Your shop is ready" screen and (later) the API
// all ask this one function.

import type { BusinessType } from "./business";
import { slugify } from "./store";

export const SHARE_REQUIREMENTS = ["products", "phone", "delivery", "payment"] as const;
export type ShareRequirement = (typeof SHARE_REQUIREMENTS)[number];

export interface ShopReadinessFacts {
  businessType: BusinessType;
  /** Products buyers can see. */
  visibleProducts: number;
  /** Of those, the ones with at least one photo. */
  productsWithPhoto: number;
  /** The shop's own phone, 855…; empty when not given yet. */
  shopPhone: string;
  /** The seller has saved delivery settings at least once. */
  deliveryConfigured: boolean;
  /** A Bakong ID is set, so buyers can pay by KHQR. */
  khqrReady: boolean;
  /** Cash on delivery is turned on. Either this or KHQR is enough to get paid. */
  codEnabled: boolean;
}

/** The requirements still missing, in the order the checklist shows them. Empty = ready to share. */
export function getMissingForSharing(facts: ShopReadinessFacts): ShareRequirement[] {
  const met: Record<ShareRequirement, boolean> = {
    // A haircut or a lesson may have nothing to photograph: a service shop needs a priced product, not a photo.
    products: facts.businessType === "service" ? facts.visibleProducts > 0 : facts.productsWithPhoto > 0,
    phone: facts.shopPhone.trim().length > 0,
    delivery: facts.deliveryConfigured,
    // A Bakong ID isn't required: cash on delivery alone lets a shop take orders.
    payment: facts.khqrReady || facts.codEnabled,
  };
  return SHARE_REQUIREMENTS.filter((requirement) => !met[requirement]);
}

export function canShareShop(facts: ShopReadinessFacts): boolean {
  return getMissingForSharing(facts).length === 0;
}

/**
 * The link a new shop gets when its name gives none (a name in Khmer has no
 * Latin letters to build one from): the seller's Telegram username, else
 * "shop-" and the last 4 digits of their phone, else nothing.
 */
export function suggestShopSlug(login: { telegramUsername?: string; phone?: string }): string {
  const fromTelegram = slugify((login.telegramUsername ?? "").replace(/^@/, ""));
  if (fromTelegram.length >= 3) return fromTelegram;
  const digits = (login.phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? `shop-${digits.slice(-4)}` : "";
}
