import { describe, expect, it } from "vitest";
import { approximateIn, computeOrderTotal, placeOrderRequestSchema, unitPriceIn, UnpricedLineError, type OrderLineInput } from "./order-total";
import { toFieldErrors } from "./form-errors";

const RATE = 4100;
const line = (key: string, quantity: number, priceUsdCents: number | null, priceKhr: number | null, discountPercent: number | null = null): OrderLineInput => ({
  key,
  quantity,
  priceUsdCents,
  priceKhr,
  discountPercent,
});

describe("unitPriceIn", () => {
  it("uses the native price in the order currency", () => {
    expect(unitPriceIn({ priceUsdCents: 125, priceKhr: 5000 }, "USD", RATE)).toBe(125);
    expect(unitPriceIn({ priceUsdCents: 125, priceKhr: 5000 }, "KHR", RATE)).toBe(5000);
  });

  it("converts a missing currency at the store's rate", () => {
    expect(unitPriceIn({ priceUsdCents: 125, priceKhr: null }, "KHR", RATE)).toBe(5125);
    expect(unitPriceIn({ priceUsdCents: null, priceKhr: 7000 }, "USD", RATE)).toBe(171);
  });

  it("is undefined for a variant with no price", () => {
    expect(unitPriceIn({ priceUsdCents: null, priceKhr: null }, "USD", RATE)).toBeUndefined();
  });
});

describe("computeOrderTotal", () => {
  it("rounds each line, then sums the lines — never converts the total", () => {
    // Three riel-only items at 7,000៛ = $1.707… each, rounded per unit to $1.71.
    const total = computeOrderTotal({ lines: [line("a", 3, null, 7000)], currency: "USD", usdToKhrRate: RATE, vatPercent: 0, deliveryFee: null });
    expect(total.lines[0]).toMatchObject({ unitPrice: 171, lineTotal: 513 });
    expect(total.total).toBe(513); // not round(21,000 / 4,100 × 100) = 512
  });

  it("mixes USD and riel lines in one currency", () => {
    const total = computeOrderTotal({
      lines: [line("coffee", 2, 125, 5000), line("cake", 1, null, 7000), line("shirt", 1, 850, null)],
      currency: "KHR",
      usdToKhrRate: RATE,
      vatPercent: 0,
      deliveryFee: null,
    });
    expect(total.lines.map((l) => l.lineTotal)).toEqual([10000, 7000, 34850]);
    expect(total.total).toBe(51850);
    expect(total.itemCount).toBe(4);
  });

  it("takes each product's discount off per unit and reports what it saved", () => {
    const total = computeOrderTotal({ lines: [line("a", 3, 125, null, 10)], currency: "USD", usdToKhrRate: RATE, vatPercent: 0, deliveryFee: null });
    expect(total.lines[0]).toMatchObject({ baseUnitPrice: 125, unitPrice: 113, lineTotal: 339 });
    expect(total).toMatchObject({ subtotal: 375, discount: 36, goods: 339, total: 339 });
  });

  it("adds VAT on the goods after discounts, then the delivery fee", () => {
    const total = computeOrderTotal({
      lines: [line("a", 2, 1000, null, 10)],
      currency: "USD",
      usdToKhrRate: RATE,
      vatPercent: 10,
      deliveryFee: { feeUsdCents: 150 },
    });
    expect(total).toMatchObject({ goods: 1800, vat: 180, deliveryFee: 150, total: 2130 });
  });

  it("converts a delivery fee set only in the other currency, and treats a blank fee as free", () => {
    const riel = computeOrderTotal({ lines: [line("a", 1, 500, null)], currency: "USD", usdToKhrRate: RATE, vatPercent: 0, deliveryFee: { feeKhr: 6000 } });
    expect(riel.deliveryFee).toBe(146);
    const free = computeOrderTotal({ lines: [line("a", 1, 500, null)], currency: "USD", usdToKhrRate: RATE, vatPercent: 0, deliveryFee: {} });
    expect(free.deliveryFee).toBe(0);
  });

  it("refuses a line with no price", () => {
    expect(() => computeOrderTotal({ lines: [line("ghost", 1, null, null)], currency: "USD", usdToKhrRate: RATE, vatPercent: 0, deliveryFee: null })).toThrow(UnpricedLineError);
  });
});

describe("approximateIn", () => {
  it("gives the other currency for the small reference figure", () => {
    expect(approximateIn(850, "USD", RATE)).toBe(34850);
    expect(approximateIn(34850, "KHR", RATE)).toBe(850);
  });
});

describe("placeOrderRequestSchema", () => {
  const valid = {
    idempotencyKey: "4b48c583-15b2-41fe-a0ee-48791767aeb3",
    lines: [{ variantId: "0f0a3c6e-7c5e-4b4a-9a63-2c1f7f3f8c11", quantity: 2 }],
    checkout: { name: "Sokha" },
  };
  const errors = (value: unknown) => {
    const result = placeOrderRequestSchema.safeParse(value);
    return result.success ? {} : toFieldErrors(result.error);
  };

  it("accepts a cart and a checkout form", () => {
    expect(errors(valid)).toEqual({});
  });

  it("refuses an empty cart, a bad quantity and the same product twice", () => {
    expect(errors({ ...valid, lines: [] })).toEqual({ lines: "cart_empty" });
    expect(errors({ ...valid, lines: [{ ...valid.lines[0], quantity: 0 }] })).toEqual({ "lines.0.quantity": "quantity_invalid" });
    expect(errors({ ...valid, lines: [{ ...valid.lines[0], quantity: 100 }] })).toEqual({ "lines.0.quantity": "quantity_invalid" });
    expect(errors({ ...valid, lines: [valid.lines[0], valid.lines[0]] })).toEqual({ lines: "product_unavailable" });
  });

  it("needs an idempotency key", () => {
    expect(errors({ ...valid, idempotencyKey: "x" })).toEqual({ idempotencyKey: "required" });
  });
});
