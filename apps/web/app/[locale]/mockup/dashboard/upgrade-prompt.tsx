"use client";

import type { PlanId } from "@khmio/shared";
import { Button, cn } from "@khmio/ui";
import { Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";

/** Shown wherever a plan doesn't include a feature. Links to Plan & billing. */
export function UpgradePrompt({
  title,
  body,
  plan,
  compact = false,
  className,
}: {
  title: string;
  /** Shown only in the full (non-compact) version. */
  body?: string;
  /** The cheapest plan that unlocks this — from getMinimumPlanFor(). */
  plan: PlanId;
  /** A one-line inline version for use inside a form. */
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("Upgrade");
  const tPlan = useTranslations("Plans");
  const locale = useLocale();
  const href = `/${locale}/mockup/dashboard/billing`;

  if (compact) {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 rounded-DEFAULT border border-dashed border-border p-3 text-sm",
          className,
        )}
      >
        <span className="flex items-center gap-2 text-muted">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          {title}
        </span>
        <Link href={href} className="flex min-h-touch items-center font-medium text-brand">
          {t("unlockWith", { plan: tPlan(plan) })}
        </Link>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-DEFAULT border border-border bg-bg p-6 text-center shadow-sm",
        className,
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/10">
        <Lock className="h-6 w-6 text-brand" aria-hidden="true" />
      </span>
      <p className="font-semibold">{title}</p>
      {body && <p className="max-w-[360px] text-sm text-muted">{body}</p>}
      <Link href={href}>
        <Button variant="primary">{t("unlockWith", { plan: tPlan(plan) })}</Button>
      </Link>
    </div>
  );
}
