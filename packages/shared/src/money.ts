import { z } from "zod";

export type Currency = "USD" | "KHR";

/** USD stored as integer cents, e.g. $8.50 -> 850. */
export const usdCentsSchema = z.number().int().nonnegative();

/** KHR stored as integer riel, e.g. ៛34,850 -> 34850 (riel has no subunit). */
export const khrSchema = z.number().int().nonnegative();

/**
 * What a seller typed in a USD price box → cents. "8.5" → 850, "1,200" → 120000.
 * Blank → undefined (no price). Anything else — letters, a minus sign, more
 * than 2 decimals — → NaN, which every money schema rejects.
 */
export function parseUsdInput(text: string): number | undefined {
  const value = text.trim().replace(/,/g, "");
  if (!value) return undefined;
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return Number.NaN;
  return Math.round(Number(value) * 100);
}

/** Same for a KHR price box → riel. Riel has no decimals, so "5000.5" → NaN. */
export function parseKhrInput(text: string): number | undefined {
  const value = text.trim().replace(/,/g, "");
  if (!value) return undefined;
  if (!/^\d+$/.test(value)) return Number.NaN;
  return Number(value);
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
