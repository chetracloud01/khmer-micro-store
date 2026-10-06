"use client";

import { maxOrderQuantity, type BuyerStockState, type Currency } from "@khmio/shared";
import { Card, cn, DiscountBadge, PriceTag } from "@khmio/ui";
import type { ReactNode } from "react";
import {
  getStartingVariant,
  getUnitKhr,
  getUnitUsdCents,
  lineKey,
  type MockProduct,
} from "@/mock/mock-data";

export function CategoryChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-touch shrink-0 snap-start whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors",
        active ? "border-brand bg-brand text-on-brand" : "border-border bg-bg text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

/** Buyer-facing stock text, already translated. */
export interface StockLabels {
  soldOut: string;
  onlyLeft: (count: number) => string;
}

/** "Sold out" or "Only 3 left" under an item; nothing when stock isn't tracked or there's plenty. */
export function StockNote({ state, labels }: { state: BuyerStockState; labels: StockLabels }) {
  if (state.kind === "sold_out") return <span className="text-xs font-semibold text-danger">{labels.soldOut}</span>;
  if (state.kind === "low") return <span className="text-xs font-medium text-warning">{labels.onlyLeft(state.available)}</span>;
  return null;
}

export function Stepper({
  qty,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  increaseDisabled = false,
  className,
}: {
  qty: number;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
  /** At the stock limit: the buyer can't add more than the shop has. */
  increaseDisabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-1 rounded-full border border-brand bg-brand/5 p-1",
        className,
      )}
    >
      {/* shrink-0 keeps both buttons a full 44px even in a 320px-wide phone's narrow card. */}
      <button
        type="button"
        aria-label={decreaseLabel}
        onClick={onDecrease}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-on-brand transition-transform active:scale-95"
      >
        −
      </button>
      <span className="min-w-6 text-center text-sm font-semibold tabular-nums" aria-live="polite">
        {qty}
      </span>
      <button
        type="button"
        aria-label={increaseLabel}
        onClick={onIncrease}
        disabled={increaseDisabled}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-on-brand transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}

/** Whether one more of this item can go in the cart. */
export function canAddMore(state: BuyerStockState, inCart: number): boolean {
  const max = maxOrderQuantity(state);
  return max === null || inCart < max;
}

export function ProductCard({
  product,
  locale,
  currency,
  quantities,
  stockFor,
  stockLabels,
  onAdjustQuantity,
  onOpen,
  addLabel,
  startingFromLabel,
  decreaseLabelFor,
  increaseLabelFor,
  className,
}: {
  product: MockProduct;
  locale: string;
  /** The buyer's currency: shown first, the other one small underneath. */
  currency: Currency;
  quantities: Record<string, number>;
  stockFor: (productId: string, variantId?: string) => BuyerStockState;
  stockLabels: StockLabels;
  onAdjustQuantity: (key: string, delta: number) => void;
  /** Opens the product's own page (photos, description, options). */
  onOpen: (product: MockProduct) => void;
  addLabel: string;
  startingFromLabel: string;
  decreaseLabelFor: (title: string) => string;
  increaseLabelFor: (title: string) => string;
  className?: string;
}) {
  const title = locale === "km" ? product.titleKm : product.titleEn;
  const hasVariants = !!product.variants?.length;
  const startingVariant = getStartingVariant(product);
  const displayUnitUsd = hasVariants ? getUnitUsdCents(product, startingVariant) : getUnitUsdCents(product);
  const displayUnitKhr = hasVariants ? getUnitKhr(product, startingVariant) : getUnitKhr(product);
  const displayOriginalUsd = product.discountPercent
    ? (hasVariants ? startingVariant?.retailPriceUsdCents : product.retailPriceUsdCents)
    : undefined;
  const displayOriginalKhr = product.discountPercent
    ? (hasVariants ? startingVariant?.retailPriceKhr : product.retailPriceKhr)
    : undefined;

  const productCartCount = hasVariants
    ? (product.variants?.reduce((sum, variant) => sum + (quantities[lineKey(product.id, variant.id)] ?? 0), 0) ?? 0)
    : (quantities[lineKey(product.id)] ?? 0);
  const baseKey = lineKey(product.id);
  const baseQty = hasVariants ? 0 : (quantities[baseKey] ?? 0);

  // A product with options is sold out only when every option is; otherwise the picker shows which are left.
  const variantStates = product.variants?.map((variant) => stockFor(product.id, variant.id)) ?? [];
  const stock: BuyerStockState = hasVariants
    ? variantStates.every((state) => state.kind === "sold_out")
      ? { kind: "sold_out" }
      : { kind: "untracked" }
    : stockFor(product.id);
  const soldOut = stock.kind === "sold_out";

  return (
    <Card className={cn("flex h-full flex-col gap-2 p-2", className)}>
      <div className="relative">
        {/* The photo opens the product too; the title below is the one a keyboard or screen reader uses. */}
        <button type="button" tabIndex={-1} aria-hidden="true" onClick={() => onOpen(product)} className="block w-full">
          {product.photoDataUrls?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element -- merchant's own upload preview, not a remote image
            <img
              src={product.photoDataUrls[0]}
              alt=""
              className={cn("aspect-square w-full rounded-DEFAULT object-cover", soldOut && "opacity-40 grayscale")}
            />
          ) : (
            <div className={cn("aspect-square w-full rounded-DEFAULT", product.photoColor, soldOut && "opacity-40 grayscale")} />
          )}
        </button>
        {soldOut && (
          <span className="pointer-events-none absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-full bg-fg/80 px-3 py-1 text-xs font-semibold text-bg">
            {stockLabels.soldOut}
          </span>
        )}
        {product.discountPercent && !soldOut && (
          <DiscountBadge percent={product.discountPercent} className="absolute left-1 top-1" />
        )}
        {hasVariants && productCartCount > 0 && (
          <span className="absolute right-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-on-brand">
            {productCartCount}
          </span>
        )}
        {!soldOut && (hasVariants || baseQty === 0) && (
          <button
            type="button"
            aria-label={addLabel}
            onClick={() => (hasVariants ? onOpen(product) : onAdjustQuantity(baseKey, 1))}
            className="absolute bottom-1 right-1 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-2xl font-bold text-on-brand shadow-md transition-transform active:scale-95"
          >
            +
          </button>
        )}
      </div>
      {/* Two lines reserved (Khmer needs line-height 1.5), so every card in a row lines up. */}
      <button type="button" onClick={() => onOpen(product)} className="line-clamp-2 min-h-touch text-left text-sm font-medium leading-normal">
        {title}
      </button>
      <div className="flex flex-col">
        {hasVariants && <span className="text-xs text-muted">{startingFromLabel}</span>}
        <PriceTag
          usdCents={displayUnitUsd}
          khr={displayUnitKhr}
          originalUsdCents={displayOriginalUsd}
          originalKhr={displayOriginalKhr}
          primary={currency}
          className="text-sm"
        />
        {!hasVariants && stock.kind === "low" && <StockNote state={stock} labels={stockLabels} />}
      </div>
      {!hasVariants && baseQty > 0 && (
        <Stepper
          qty={baseQty}
          onDecrease={() => onAdjustQuantity(baseKey, -1)}
          onIncrease={() => onAdjustQuantity(baseKey, 1)}
          decreaseLabel={decreaseLabelFor(title)}
          increaseLabel={increaseLabelFor(title)}
          increaseDisabled={!canAddMore(stock, baseQty)}
          className="mt-auto"
        />
      )}
    </Card>
  );
}
