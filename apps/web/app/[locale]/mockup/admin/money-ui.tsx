"use client";

import {
  formatKhr,
  formatUsd,
  type AdminRole,
  type Currency,
  type InvoiceView,
  type PaymentAttemptStatus,
} from "@khmer-micro-store/shared";
import type { ReactNode } from "react";
import type { MockFailedCheck } from "@/mock/mock-admin-billing";

// Shared by the admin's money screens (subscriptions, invoices, buyer
// payments, failed checks) so amounts, references and status colours read
// the same on all of them.

export function money(amountMinor: number, currency: Currency): string {
  return currency === "USD" ? formatUsd(amountMinor) : formatKhr(amountMinor);
}

/**
 * Totals across stores are kept per currency — dollars and riel are never
 * added into one number at some rate (docs/blueprint.md "Multi-currency
 * pricing and totals").
 */
export function sumByCurrency(rows: { currency: Currency; amountMinor: number }[]): Record<Currency, number> {
  const sums: Record<Currency, number> = { USD: 0, KHR: 0 };
  for (const row of rows) sums[row.currency] += row.amountMinor;
  return sums;
}

/** "$17.00 + 20,000៛" — only the currencies with money in them; "$0.00" when neither has. */
export function formatSums(sums: Record<Currency, number>): string {
  const parts = (["USD", "KHR"] as const).filter((currency) => sums[currency] > 0).map((currency) => money(sums[currency], currency));
  return parts.length > 0 ? parts.join(" + ") : money(0, "USD");
}

/** A 32-character KHQR MD5 shortened for a table cell; the full one shows in the details. */
export function shortRef(ref: string): string {
  return ref.length > 18 ? `${ref.slice(0, 8)}…${ref.slice(-4)}` : ref;
}

export const INVOICE_VIEW_STYLES: Record<InvoiceView, string> = {
  due: "bg-info/10 text-info",
  overdue: "bg-danger/10 text-danger",
  paid: "bg-success/10 text-success",
  void: "bg-border/30 text-muted",
};

export const ATTEMPT_STATUS_STYLES: Record<PaymentAttemptStatus, string> = {
  pending: "bg-warning/10 text-warning",
  paid: "bg-success/10 text-success",
  expired: "bg-border/30 text-muted",
  failed: "bg-danger/10 text-danger",
};

export const CHECK_STATUS_STYLES: Record<MockFailedCheck["status"], string> = {
  open: "bg-danger/10 text-danger",
  confirmed: "bg-success/10 text-success",
  closed: "bg-border/30 text-muted",
};

export const ROLE_STYLES: Record<AdminRole, string> = {
  owner: "bg-brand/10 text-brand",
  support: "bg-info/10 text-info",
  finance: "bg-success/10 text-success",
};

/** Label–value pairs in a details panel. */
export function DetailList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 rounded-DEFAULT bg-border/10 p-3">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-xs text-muted">{item.label}</dt>
          <dd className="break-words font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
