import { formatKhr, formatUsd } from "@khmer-micro-store/shared";
import { cn } from "./cn";

export interface PriceTagProps {
  usdCents?: number;
  khr?: number;
  /** Pre-discount price, shown struck through next to the current price. */
  originalUsdCents?: number;
  originalKhr?: number;
  className?: string;
}

export function PriceTag({ usdCents, khr, originalUsdCents, originalKhr, className }: PriceTagProps) {
  if (usdCents == null && khr == null) return null;

  const hasDiscount = originalUsdCents != null || originalKhr != null;

  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span className="font-semibold text-fg">
        {usdCents != null && <span>{formatUsd(usdCents)}</span>}
        {usdCents != null && khr != null && <span className="mx-1 font-normal text-muted">/</span>}
        {khr != null && <span>{formatKhr(khr)}</span>}
      </span>
      {hasDiscount && (
        <span className="text-xs font-normal text-muted line-through">
          {originalUsdCents != null ? formatUsd(originalUsdCents) : formatKhr(originalKhr!)}
        </span>
      )}
    </span>
  );
}
