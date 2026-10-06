import { platformProductSchema, sitePageSchema } from "@khmer-micro-store/shared";
import { describe, expect, it } from "vitest";
import { mockComingSoonPages, mockHomePage, mockPlatformProducts, mockPricingPage, mockShopPage } from "./mock-site";

// The sample content must be exactly what the admin could publish, so the
// mockups never show something the real site couldn't.
describe("sample website content", () => {
  it("passes the site kit's rules", () => {
    for (const page of [mockHomePage, mockShopPage, mockPricingPage, mockComingSoonPages.class, mockComingSoonPages.rent]) expect(sitePageSchema.safeParse(page).error?.issues ?? []).toEqual([]);
    for (const product of mockPlatformProducts) expect(platformProductSchema.safeParse(product).error?.issues ?? []).toEqual([]);
  });

  it("has one entry per platform product", () => {
    expect(mockPlatformProducts.map((product) => product.id)).toEqual(["shop", "class", "rent"]);
  });
});
