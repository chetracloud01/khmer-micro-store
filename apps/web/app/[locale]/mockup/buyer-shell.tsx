"use client";

import { cn } from "@khmer-micro-store/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

// The frame every buyer screen after the shop page shares (cart, checkout,
// payment, order success): one readable column — full width on phones, a
// centred card on the page background from tablet up, like a hosted checkout.

export function BuyerShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <div
        className={cn(
          "mx-auto flex min-h-dvh w-full max-w-[560px] flex-col bg-bg md:border-x md:border-border",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Sticky top bar: a 44px back button, the title, and optional extra content (e.g. progress steps). */
export function BuyerTopBar({
  backHref,
  backLabel,
  title,
  subtitle,
  children,
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-20 flex flex-col gap-2 border-b border-border bg-bg px-2 py-2">
      <div className="flex items-center gap-1">
        <Link
          href={backHref}
          aria-label={backLabel}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-border/30"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold leading-normal">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
      </div>
      {children}
    </header>
  );
}

/** Where the buyer is in Cart → Checkout → Pay. */
export function BuyerSteps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 px-2 pb-1">
      {steps.map((step, index) => (
        <li key={step} className="flex min-w-0 flex-1 flex-col gap-1" aria-current={index === current ? "step" : undefined}>
          <span className={cn("h-1 rounded-full", index <= current ? "bg-brand" : "bg-border")} aria-hidden="true" />
          <span className={cn("truncate text-xs", index === current ? "font-semibold text-fg" : "text-muted")}>{step}</span>
        </li>
      ))}
    </ol>
  );
}

/** Fixed bottom action bar, the width of the column, clear of the phone's home bar. */
export function BuyerBottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30">
      <div className="pb-safe mx-auto w-full max-w-[560px] border-t border-border bg-bg px-4 pt-3 shadow-[0_-4px_12px_rgb(15_23_42/0.06)] md:border-x">
        {children}
      </div>
    </div>
  );
}
