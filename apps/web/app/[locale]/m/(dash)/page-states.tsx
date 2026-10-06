"use client";

import { Button } from "@khmio/ui";
import { useTranslations } from "next-intl";

/** Grey blocks while a dashboard page's data is on its way. */
export function PageLoading() {
  const t = useTranslations("App");
  return (
    <div className="flex flex-col gap-3 p-4" aria-busy="true">
      <span className="sr-only" role="status">
        {t("loading")}
      </span>
      <div className="h-7 w-48 animate-pulse rounded-DEFAULT bg-border/40 motion-reduce:animate-none" />
      <div className="h-40 animate-pulse rounded-2xl bg-border/40 motion-reduce:animate-none" />
      <div className="h-24 animate-pulse rounded-2xl bg-border/40 motion-reduce:animate-none" />
    </div>
  );
}

/** The API can't be reached: say so plainly and offer to try again. */
export function PageOffline({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("App");
  return (
    <div className="flex flex-col items-center gap-3 p-4 py-16 text-center" role="alert">
      <p className="font-semibold">{t("offlineTitle")}</p>
      <p className="max-w-[32ch] text-sm text-muted">{t("offlineBody")}</p>
      <Button variant="primary" onClick={onRetry}>
        {t("retry")}
      </Button>
    </div>
  );
}
