"use client";

import type { SubscriptionStatus } from "@khmer-micro-store/shared";
import { Button, Card, cn } from "@khmer-micro-store/ui";
import { useLocale, useTranslations } from "next-intl";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// Building blocks of the real admin pages (the same look as the approved mockup's).

export const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  trialing: "bg-brand/10 text-brand",
  active: "bg-success/10 text-success",
  grace: "bg-warning/10 text-warning",
  paused: "bg-danger/10 text-danger",
};

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", className)}>{children}</span>;
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-fg">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const STAT_TONES = {
  brand: "bg-brand/10 text-brand",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-border/20 text-muted",
} as const;

export function StatCard({ icon: Icon, label, value, tone = "brand" }: { icon: LucideIcon; label: string; value: string; tone?: keyof typeof STAT_TONES }) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-DEFAULT", STAT_TONES[tone])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs leading-normal text-muted">{label}</span>
    </Card>
  );
}

/** Loading, and "can't reach the server" with a retry. */
export function LoadState({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  const t = useTranslations("App");
  if (failed) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="font-semibold">{t("offlineTitle")}</p>
        <Button variant="primary" onClick={onRetry}>
          {t("retry")}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <span className="sr-only" role="status">
        {t("loading")}
      </span>
      <div className="h-8 w-56 animate-pulse rounded-DEFAULT bg-border/40 motion-reduce:animate-none" />
      <div className="h-48 animate-pulse rounded-2xl bg-border/40 motion-reduce:animate-none" />
    </div>
  );
}

/** "2 Oct 2026" / "2 តុលា 2026". */
export function useDateText() {
  const locale = useLocale();
  return {
    date: (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(locale === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"),
    dateTime: (iso: string) =>
      new Date(iso).toLocaleString(locale === "km" ? "km-KH" : "en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}
