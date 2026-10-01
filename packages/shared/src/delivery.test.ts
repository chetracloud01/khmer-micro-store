import { describe, expect, it } from "vitest";
import { deliverySettingsSchema, getDeliveryQuote, SUGGESTED_DELIVERY_SETTINGS } from "./delivery";

describe("SUGGESTED_DELIVERY_SETTINGS", () => {
  it("passes the same check the delivery page saves with, so a new seller can save it as it is", () => {
    expect(deliverySettingsSchema.safeParse(SUGGESTED_DELIVERY_SETTINGS).success).toBe(true);
  });

  it("quotes a central district, an outer one and a province", () => {
    expect(getDeliveryQuote(SUGGESTED_DELIVERY_SETTINGS, { fulfilment: "delivery", area: "phnom_penh", districtId: "daun-penh" })).toEqual({
      status: "ok",
      fee: { feeUsdCents: 100, feeKhr: 4000 },
    });
    expect(getDeliveryQuote(SUGGESTED_DELIVERY_SETTINGS, { fulfilment: "delivery", area: "phnom_penh", districtId: "sen-sok" })).toMatchObject({ status: "ok" });
    expect(getDeliveryQuote(SUGGESTED_DELIVERY_SETTINGS, { fulfilment: "delivery", area: "province", provinceId: "kampot" })).toMatchObject({ status: "ok" });
  });

  it("starts with pickup off and no drivers — the shop's own details", () => {
    expect(SUGGESTED_DELIVERY_SETTINGS.pickup.enabled).toBe(false);
    expect(SUGGESTED_DELIVERY_SETTINGS.drivers).toEqual([]);
  });
});
