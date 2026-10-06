import type { PlatformProductId } from "@khmer-micro-store/shared";

// The platform website's pages — fixed facts, not content. A plain module
// (no "use client"), so server pages such as the admin's Preview can read it.

export const SITE_PAGE_KEYS = ["home", "shop", "class", "rent", "pricing"] as const;
export type SitePageKey = (typeof SITE_PAGE_KEYS)[number];

export const SITE_PAGE_INFO: Record<SitePageKey, { path: string; product?: PlatformProductId }> = {
  home: { path: "/" },
  shop: { path: "/products/shop" },
  class: { path: "/products/class", product: "class" },
  rent: { path: "/products/rent", product: "rent" },
  pricing: { path: "/pricing" },
};
