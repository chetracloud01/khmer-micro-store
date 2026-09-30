import { z } from "zod";
import { BILLING_PERIOD_DAYS, type PlanId, type SubscriptionState } from "./plans";

// What a store owes the platform — docs/blueprint.md "Subscription life
// cycle" and the subscription_invoices table. Amounts are fixed per currency
// by the plan, so an invoice is always a whole number of cents or riel.

export const invoiceStatusSchema = z.enum(["open", "paid", "void"]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

/** new = leaving the Free trial, renewal = next month, upgrade = prorated difference. */
export const invoiceReasonSchema = z.enum(["new", "renewal", "upgrade"]);
export type InvoiceReason = z.infer<typeof invoiceReasonSchema>;

/** How an invoice reads to a person. "Overdue" is worked out from the due date, never stored. */
export type InvoiceView = "due" | "overdue" | "paid" | "void";

/** dueInDays: days until the due date; negative = that many days late. */
export function getInvoiceView(invoice: { status: InvoiceStatus; dueInDays: number }): InvoiceView {
  if (invoice.status !== "open") return invoice.status;
  return invoice.dueInDays < 0 ? "overdue" : "due";
}

/**
 * An admin marking an invoice paid by hand (a bank transfer, or a KHQR
 * payment Bakong confirmed outside the app). It overrides the automatic
 * check, so it must name the bank's own reference and is written to audit_logs.
 */
export const invoiceManualPaymentSchema = z.object({
  bankReference: z.string().trim().min(4, "too_short").max(60, "too_long"),
  note: z.string().trim().max(200, "too_long"),
});
export type InvoiceManualPayment = z.infer<typeof invoiceManualPaymentSchema>;

/** Cancelling an invoice raised by mistake. The store is not charged and nothing reopens. */
export const invoiceVoidSchema = z.object({
  reason: z.string().trim().min(5, "too_short").max(200, "too_long"),
});
export type InvoiceVoid = z.infer<typeof invoiceVoidSchema>;

/**
 * A store's subscription after one of its invoices is paid:
 * - new: the chosen plan starts, with a fresh period.
 * - renewal: an overdue or paused store reopens at once with a fresh period;
 *   a store that paid early gets the next period added on.
 * - upgrade: the plan changed when the upgrade was chosen — paying changes nothing here.
 */
export function applyInvoicePaid(state: SubscriptionState, invoice: { plan: PlanId; reason: InvoiceReason }): SubscriptionState {
  if (invoice.reason === "new") return { plan: invoice.plan, status: "active", daysLeft: BILLING_PERIOD_DAYS };
  if (invoice.reason === "upgrade") return state;
  if (state.status === "grace" || state.status === "paused") return { ...state, status: "active", daysLeft: BILLING_PERIOD_DAYS };
  if (state.status === "active") return { ...state, daysLeft: state.daysLeft + BILLING_PERIOD_DAYS };
  return state;
}
