import { describe, expect, it } from "vitest";
import { canShareShop, getMissingForSharing, suggestShopSlug, type ShopReadinessFacts } from "./shop-readiness";
import { shopSlugSchema } from "./store";

describe("sharing the shop link", () => {
  const newShop: ShopReadinessFacts = {
    businessType: "shop",
    visibleProducts: 0,
    productsWithPhoto: 0,
    shopPhone: "",
    deliveryConfigured: false,
    khqrReady: false,
    codEnabled: true,
  };

  it("lists what a brand-new shop still needs, in checklist order", () => {
    expect(getMissingForSharing(newShop)).toEqual(["products", "phone", "delivery"]);
    expect(canShareShop(newShop)).toBe(false);
  });

  it("is ready with cash on delivery alone — a Bakong ID is never required", () => {
    const ready = { ...newShop, visibleProducts: 1, productsWithPhoto: 1, shopPhone: "85512345678", deliveryConfigured: true };
    expect(getMissingForSharing(ready)).toEqual([]);
    expect(canShareShop(ready)).toBe(true);
  });

  it("needs a product photo, except for a service shop", () => {
    const set = { ...newShop, shopPhone: "85512345678", deliveryConfigured: true, visibleProducts: 1 };
    expect(getMissingForSharing(set)).toEqual(["products"]);
    expect(getMissingForSharing({ ...set, businessType: "service" })).toEqual([]);
  });

  it("needs some way to get paid", () => {
    const noPayment = { ...newShop, visibleProducts: 1, productsWithPhoto: 1, shopPhone: "85512345678", deliveryConfigured: true, codEnabled: false };
    expect(getMissingForSharing(noPayment)).toEqual(["payment"]);
    expect(canShareShop({ ...noPayment, khqrReady: true })).toBe(true);
  });
});

describe("a shop link for a name in Khmer", () => {
  it("comes from the Telegram username, else the phone", () => {
    expect(suggestShopSlug({ telegramUsername: "@Srey_Neang" })).toBe("srey-neang");
    expect(suggestShopSlug({ phone: "85512345678" })).toBe("shop-5678");
    // A Telegram name too short to use falls back to the phone.
    expect(suggestShopSlug({ telegramUsername: "@a_", phone: "855971234567" })).toBe("shop-4567");
    expect(suggestShopSlug({})).toBe("");
  });

  it("always passes the shop link rule when it suggests one", () => {
    for (const login of [{ telegramUsername: "@Srey_Neang" }, { telegramUsername: "__x__long_name__" }, { phone: "85512345678" }]) {
      expect(shopSlugSchema.safeParse(suggestShopSlug(login)).success).toBe(true);
    }
  });
});
