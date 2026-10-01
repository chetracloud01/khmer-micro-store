"use client";

import { Card } from "@khmer-micro-store/ui";
import { ChevronRight, Clock, ExternalLink, Link2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useMerchant } from "./merchant-context";
import { SetupChecklist } from "./setup-checklist";

const DAY_MS = 24 * 60 * 60 * 1000;

// The dashboard home: the shop, its link and what's left to set up.
export default function MerchantHomePage() {
  const t = useTranslations("App");
  const tType = useTranslations("BusinessType");
  const locale = useLocale();
  const { me, store } = useMerchant();
  const subscription = me.store?.subscription;
  const trialEndsAt = subscription?.trialEndsAt ? new Date(subscription.trialEndsAt) : null;
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / DAY_MS)) : null;
  const shopHref = `/${locale}/s/${store.slug}`;

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">{t("homeGreeting", { name: me.merchant.firstName })}</p>
        <h1 className="text-2xl font-bold leading-normal">{store.name}</h1>
        <p className="text-sm text-muted">{tType(store.businessType)}</p>
      </div>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-muted">{t("shopLinkLabel")}</p>
            <p className="truncate font-medium">/s/{store.slug}</p>
          </div>
        </div>
        <Link href={shopHref} target="_blank" className="flex min-h-touch items-center gap-2 text-sm font-medium text-brand">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {t("viewShop")}
        </Link>
        {trialDaysLeft !== null && subscription?.status === "trialing" && (
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted">{t("planLabel")}</p>
              <p className="font-medium">{t("planTrial", { count: trialDaysLeft })}</p>
            </div>
          </div>
        )}
      </Card>

      <SetupChecklist />

      <Card className="flex flex-col gap-2 border-dashed p-4">
        <p className="font-semibold">{t("previewTitle")}</p>
        <p className="text-sm text-muted">{t("previewBody")}</p>
        <Link href={`/${locale}/mockup/dashboard`} className="flex min-h-touch items-center justify-between gap-2 text-sm font-medium text-brand">
          {t("openPreview")}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Card>
    </div>
  );
}
