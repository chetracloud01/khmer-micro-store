import { convertKhrToUsdCents, convertUsdCentsToKhr, type Currency } from "@khmer-micro-store/shared";
import {
  getDiscountedUnitAmount,
  getEffectiveExchangeRate,
  getUnitAmount,
  lineKey,
  mockProducts,
  mockStore,
  type MockPromoCode,
} from "@/mock/mock-data";

/**
 * The buyer's order total in their chosen currency, following the rule in
 * docs/blueprint.md "Multi-currency pricing and totals": each line uses its
 * native price in that currency, or converts via the store's rate if it has
 * none, rounding each line before summing. Shared by Checkout and the KHQR
 * payment screen so both show exactly the same amount.
 */
export function useCheckoutTotal(
  quantities: Record<string, number>,
  locale: string,
  appliedPromo: MockPromoCode | null,
  currency: Currency,
) {
  const rate = getEffectiveExchangeRate(mockStore);

  const lines = mockProducts.flatMap((product) => {
    const title = locale === "km" ? product.titleKm : product.titleEn;
    if (product.variants?.length) {
      return product.variants.flatMap((variant) => {
        const key = lineKey(product.id, variant.id);
        const qty = quantities[key] ?? 0;
        if (qty === 0) return [];
        const base = getUnitAmount(product, currency, rate, variant) ?? 0;
        const discounted = getDiscountedUnitAmount(product, currency, rate, variant) ?? 0;
        const variantLabel = locale === "km" ? variant.labelKm : variant.labelEn;
        return [{ key, title: `${title} – ${variantLabel}`, qty, base, discounted }];
      });
    }
    const key = lineKey(product.id);
    const qty = quantities[key] ?? 0;
    if (qty === 0) return [];
    const base = getUnitAmount(product, currency, rate) ?? 0;
    const discounted = getDiscountedUnitAmount(product, currency, rate) ?? 0;
    return [{ key, title, qty, base, discounted }];
  });

  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.base * line.qty, 0);
  const afterItemDiscount = lines.reduce((sum, line) => sum + line.discounted * line.qty, 0);
  const itemDiscount = subtotal - afterItemDiscount;

  const promoDiscount = !appliedPromo
    ? 0
    : appliedPromo.type === "percent"
      ? Math.round(afterItemDiscount * (appliedPromo.value / 100))
      : Math.min(
          currency === "USD" ? appliedPromo.value : convertUsdCentsToKhr(appliedPromo.value, rate),
          afterItemDiscount,
        );

  const goodsAfterDiscount = afterItemDiscount - promoDiscount;
  const vat = Math.round(goodsAfterDiscount * (mockStore.vatPercent / 100));
  const deliveryFee =
    currency === "USD"
      ? mockStore.deliveryFeeUsdCents
      : convertUsdCentsToKhr(mockStore.deliveryFeeUsdCents, rate);
  const total = goodsAfterDiscount + vat + deliveryFee;
  const secondaryTotal = currency === "USD" ? convertUsdCentsToKhr(total, rate) : convertKhrToUsdCents(total, rate);

  return {
    lines,
    itemCount,
    subtotal,
    itemDiscount,
    promoDiscount,
    deliveryFee,
    vat,
    total,
    secondaryTotal,
  };
}
