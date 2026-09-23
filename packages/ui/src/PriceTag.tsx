import { formatKhr, formatUsd } from "@khmer-micro-store/shared";
import { cn } from "./cn";

export interface PriceTagProps {
  usdCents?: number;
  khr?: number;
  className?: string;
}

export function PriceTag({ usdCents, khr, className }: PriceTagProps) {
  if (usdCents == null && khr == null) return null;

  return (
    <span className={cn("font-semibold text-fg", className)}>
      {usdCents != null && <span>{formatUsd(usdCents)}</span>}
      {usdCents != null && khr != null && <span className="mx-1 font-normal text-muted">/</span>}
      {khr != null && <span>{formatKhr(khr)}</span>}
    </span>
  );
}
