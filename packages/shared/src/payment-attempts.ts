import { z } from "zod";
import type { Currency } from "./money";

// Every try to pay for a buyer's order — the payment_attempts table in
// docs/blueprint.md. The rule the whole app keeps: an attempt is paid only
// when the provider's own status API reports the exact currency and amount.
// Nobody — not a callback, not an admin — can mark one paid another way.

export const paymentProviderSchema = z.enum(["bakong_khqr", "aba_payway"]);
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;

export const paymentAttemptStatusSchema = z.enum(["pending", "paid", "expired", "failed"]);
export type PaymentAttemptStatus = z.infer<typeof paymentAttemptStatusSchema>;

/** Why a status check needs a person to look. */
export const paymentCheckIssueSchema = z.enum([
  /** The provider's status API kept failing, so we don't know if the buyer paid. */
  "provider_unreachable",
  /** The provider says paid, but for a different amount. */
  "amount_mismatch",
  /** The provider says paid, but in the other currency. */
  "currency_mismatch",
  /** The money arrived after the code expired and the order was cancelled. */
  "paid_after_expiry",
]);
export type PaymentCheckIssue = z.infer<typeof paymentCheckIssueSchema>;

export interface PaymentAmount {
  currency: Currency;
  amountMinor: number;
}

/** Integer match on both currency and amount — never "close enough", never converted. */
export function isExactPaymentMatch(expected: PaymentAmount, reported: PaymentAmount): boolean {
  return expected.currency === reported.currency && expected.amountMinor === reported.amountMinor;
}

/**
 * What one status check found.
 * reported = what the provider says was paid; null = it says nothing was paid yet;
 * "unreachable" = the provider didn't answer.
 */
export function evaluatePaymentCheck(
  expected: PaymentAmount,
  reported: PaymentAmount | null | "unreachable",
  attemptExpired: boolean,
): { outcome: "paid" } | { outcome: "not_paid" } | { outcome: "issue"; issue: PaymentCheckIssue } {
  if (reported === "unreachable") return { outcome: "issue", issue: "provider_unreachable" };
  if (reported === null) return { outcome: "not_paid" };
  if (reported.currency !== expected.currency) return { outcome: "issue", issue: "currency_mismatch" };
  if (reported.amountMinor !== expected.amountMinor) return { outcome: "issue", issue: "amount_mismatch" };
  if (attemptExpired) return { outcome: "issue", issue: "paid_after_expiry" };
  return { outcome: "paid" };
}

/** Closing a failed check by hand: say what was done about it (refund arranged, buyer paid again…). */
export const failedCheckCloseSchema = z.object({
  note: z.string().trim().min(5, "too_short").max(300, "too_long"),
});
export type FailedCheckClose = z.infer<typeof failedCheckCloseSchema>;
