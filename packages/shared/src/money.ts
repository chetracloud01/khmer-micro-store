import { z } from "zod";

export type Currency = "USD" | "KHR";

/** USD stored as integer cents, e.g. $8.50 -> 850. */
export const usdCentsSchema = z.number().int().nonnegative();

/** KHR stored as integer riel, e.g. ៛34,850 -> 34850 (riel has no subunit). */
export const khrSchema = z.number().int().nonnegative();

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatKhr(riel: number): string {
  return `${riel.toLocaleString("en-US")}៛`;
}

export function convertUsdCentsToKhr(cents: number, usdToKhrRate: number): number {
  return Math.round((cents / 100) * usdToKhrRate);
}

export function convertKhrToUsdCents(riel: number, usdToKhrRate: number): number {
  return Math.round((riel / usdToKhrRate) * 100);
}
