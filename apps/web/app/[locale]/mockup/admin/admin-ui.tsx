"use client";

import type { SubscriptionStatus } from "@khmer-micro-store/shared";
import { Card, cn } from "@khmer-micro-store/ui";
import { Construction, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { MockKycStatus } from "@/mock/mock-data";

// Standard building blocks for every admin page, so new pages look and
// behave the same without re-deciding layout each time.

export const STATUS_STYLES: Record<SubscriptionStatus, string> = {
  trialing: "bg-brand/10 text-brand",
  active: "bg-success/10 text-success",
  grace: "bg-warning/10 text-warning",
  paused: "bg-danger/10 text-danger",
};

export const KYC_STYLES: Record<MockKycStatus, string> = {
  not_submitted: "bg-border/30 text-muted",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
};

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

/** Title, one-line description, and the page's main actions on the right. */
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

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {aside}
    </div>
  );
}

const STAT_TONES = {
  brand: "bg-brand/10 text-brand",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  muted: "bg-border/20 text-muted",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "brand",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: keyof typeof STAT_TONES;
}) {
  return (
    <Card className="flex flex-col gap-2 p-4">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-DEFAULT", STAT_TONES[tone])}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="text-2xl font-bold tabular-nums">{value}</span>
      <span className="text-xs leading-snug text-muted">{label}</span>
    </Card>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
      <p className="font-medium text-fg">{title}</p>
      {body && <p className="max-w-sm text-sm text-muted">{body}</p>}
    </div>
  );
}

// Form blocks (FormSection, FormActions, ReadOnlyField) are shared with the
// merchant dashboard — see ../form-ui.tsx.

export function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <Card className="flex flex-col items-center gap-3 px-4 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-border/20">
        <Construction className="h-6 w-6 text-muted" aria-hidden="true" />
      </span>
      <p className="font-semibold text-fg">{title}</p>
      <p className="max-w-md text-sm text-muted">{body}</p>
    </Card>
  );
}
