"use client";

import { Card, cn, DiscountBadge, PriceTag } from "@khmer-micro-store/ui";
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
        "min-h-touch shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors",
        active ? "border-brand bg-brand text-white" : "border-border bg-bg text-muted hover:text-fg",
      )}
    >
      {children}
    </button>
  );
}

export function Stepper({
  qty,
  onDecrease,
  onIncrease,
  decreaseLabel,
  increaseLabel,
  className,
}: {
  qty: number;
  onDecrease: () => void;
  onIncrease: () => void;
  decreaseLabel: string;
  increaseLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-full border border-brand bg-brand/5 p-1",
        className,
      )}
    >
      <button
        type="button"
        aria-label={decreaseLabel}
        onClick={onDecrease}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-bold text-white"
      >
        −
      </button>
      <span className="text-sm font-semibold">{qty}</span>
      <button
        type="button"
        aria-label={increaseLabel}
        onClick={onIncrease}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-lg font-bold text-white"
      >
        +
      </button>
    </div>
  );
}

export function VariantRow({
  label,
  usdCents,
  khr,
  originalUsdCents,
  originalKhr,
  qty,
  onDecrease,
  onIncrease,
  addLabel,
  decreaseLabel,
  increaseLabel,
}: {
  label: string;
  usdCents?: number;
  khr?: number;
  originalUsdCents?: number;
  originalKhr?: number;
  qty: number;
  onDecrease: () => void;
  onIncrease: () => void;
  addLabel: string;
  decreaseLabel: string;
  increaseLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-col">
        <span className="text-sm font-medium">{label}</span>
        <PriceTag usdCents={usdCents} khr={khr} originalUsdCents={originalUsdCents} originalKhr={originalKhr} className="text-sm" />
      </div>
      {qty === 0 ? (
        <button
          type="button"
          aria-label={addLabel}
          onClick={onIncrease}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white"
        >
          +
        </button>
      ) : (
        <Stepper
          qty={qty}
          onDecrease={onDecrease}
          onIncrease={onIncrease}
          decreaseLabel={decreaseLabel}
          increaseLabel={increaseLabel}
          className="shrink-0"
        />
      )}
    </div>
  );
}

export function ProductCard({
  product,
  locale,
  quantities,
  onAdjustQuantity,
  onOpenPicker,
  addLabel,
  startingFromLabel,
  decreaseLabelFor,
  increaseLabelFor,
  className,
}: {
  product: MockProduct;
  locale: string;
  quantities: Record<string, number>;
  onAdjustQuantity: (key: string, delta: number) => void;
  onOpenPicker: (product: MockProduct) => void;
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
    ? (hasVariants ? startingVariant?.priceUsdCents : product.priceUsdCents)
    : undefined;
  const displayOriginalKhr = product.discountPercent
    ? (hasVariants ? startingVariant?.priceKhr : product.priceKhr)
    : undefined;

  const productCartCount = hasVariants
    ? (product.variants?.reduce((sum, variant) => sum + (quantities[lineKey(product.id, variant.id)] ?? 0), 0) ?? 0)
    : (quantities[lineKey(product.id)] ?? 0);
  const baseKey = lineKey(product.id);
  const baseQty = hasVariants ? 0 : (quantities[baseKey] ?? 0);

  return (
    <Card className={cn("flex flex-col gap-2 p-2", className)}>
      <div className="relative">
        <div className={`aspect-square w-full rounded-DEFAULT ${product.photoColor}`} />
        {product.discountPercent && (
          <DiscountBadge percent={product.discountPercent} className="absolute left-1 top-1" />
        )}
        {hasVariants && productCartCount > 0 && (
          <span className="absolute right-1 top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-white">
            {productCartCount}
          </span>
        )}
        {(hasVariants || baseQty === 0) && (
          <button
            type="button"
            aria-label={addLabel}
            onClick={() => (hasVariants ? onOpenPicker(product) : onAdjustQuantity(baseKey, 1))}
            className="absolute bottom-1 right-1 flex h-11 w-11 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white shadow-md transition-transform active:scale-95"
          >
            +
          </button>
        )}
      </div>
      <span className="line-clamp-2 text-sm font-medium leading-snug">{title}</span>
      <div className="flex items-center gap-1">
        {hasVariants && <span className="text-xs text-muted">{startingFromLabel}</span>}
        <PriceTag
          usdCents={displayUnitUsd}
          khr={displayUnitKhr}
          originalUsdCents={displayOriginalUsd}
          originalKhr={displayOriginalKhr}
          className="text-sm"
        />
      </div>
      {!hasVariants && baseQty > 0 && (
        <Stepper
          qty={baseQty}
          onDecrease={() => onAdjustQuantity(baseKey, -1)}
          onIncrease={() => onAdjustQuantity(baseKey, 1)}
          decreaseLabel={decreaseLabelFor(title)}
          increaseLabel={increaseLabelFor(title)}
        />
      )}
    </Card>
  );
}
