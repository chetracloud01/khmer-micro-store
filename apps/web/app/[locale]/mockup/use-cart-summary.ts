import { convertUsdCentsToKhr } from "@khmer-micro-store/shared";
import {
  getAllLineContexts,
  getEffectiveExchangeRate,
  getUnitUsdCents,
  lineKey,
  mockProducts,
  mockStore,
  type MockPromoCode,
} from "@/mock/mock-data";

export interface CartLineSummary {
  key: string;
  label: string;
  qty: number;
  lineTotalUsdCents: number;
}

export function useCartSummary(
  quantities: Record<string, number>,
  locale: string,
  appliedPromo: MockPromoCode | null,
) {
  const cartCount = Object.values(quantities).reduce((sum, qty) => sum + qty, 0);

  const lineContexts = getAllLineContexts(mockProducts);
  const originalSubtotalUsdCents = lineContexts.reduce((sum, ctx) => {
    const qty = quantities[ctx.key] ?? 0;
    return ctx.baseUsdCents != null ? sum + ctx.baseUsdCents * qty : sum;
  }, 0);
  const subtotalAfterItemDiscountUsdCents = lineContexts.reduce((sum, ctx) => {
    const qty = quantities[ctx.key] ?? 0;
    return ctx.unitUsdCents != null ? sum + ctx.unitUsdCents * qty : sum;
  }, 0);
  const itemDiscountUsdCents = originalSubtotalUsdCents - subtotalAfterItemDiscountUsdCents;

  const promoDiscountUsdCents = !appliedPromo
    ? 0
    : appliedPromo.type === "percent"
      ? Math.round(subtotalAfterItemDiscountUsdCents * (appliedPromo.value / 100))
      : Math.min(appliedPromo.value, subtotalAfterItemDiscountUsdCents);

  const amountBeforeVatUsdCents = subtotalAfterItemDiscountUsdCents - promoDiscountUsdCents;
  const vatUsdCents = Math.round(amountBeforeVatUsdCents * (mockStore.vatPercent / 100));
  const totalUsdCents = amountBeforeVatUsdCents + vatUsdCents;
  const exchangeRate = getEffectiveExchangeRate(mockStore);
  const totalKhr = convertUsdCentsToKhr(totalUsdCents, exchangeRate);

  const cartLines: CartLineSummary[] = mockProducts.flatMap((product) => {
    const title = locale === "km" ? product.titleKm : product.titleEn;
    if (product.variants?.length) {
      return product.variants.flatMap((variant) => {
        const key = lineKey(product.id, variant.id);
        const qty = quantities[key] ?? 0;
        if (qty === 0) return [];
        const unitUsdCents = getUnitUsdCents(product, variant) ?? 0;
        const variantLabel = locale === "km" ? variant.labelKm : variant.labelEn;
        return [{ key, label: `${title} – ${variantLabel}`, qty, lineTotalUsdCents: unitUsdCents * qty }];
      });
    }
    const key = lineKey(product.id);
    const qty = quantities[key] ?? 0;
    if (qty === 0) return [];
    const unitUsdCents = getUnitUsdCents(product) ?? 0;
    return [{ key, label: title, qty, lineTotalUsdCents: unitUsdCents * qty }];
  });

  return {
    cartCount,
    cartLines,
    originalSubtotalUsdCents,
    itemDiscountUsdCents,
    promoDiscountUsdCents,
    amountBeforeVatUsdCents,
    vatUsdCents,
    totalUsdCents,
    totalKhr,
  };
}
