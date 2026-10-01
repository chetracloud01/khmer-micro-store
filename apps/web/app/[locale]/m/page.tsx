"use client";

import { Button, Card } from "@khmer-micro-store/ui";
import { ChevronRight, Clock, Link2, LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, getMe, type Me } from "@/lib/api";
import { AppFrame, AppLoading, AppOffline } from "./app-frame";

const DAY_MS = 24 * 60 * 60 * 1000;

// The real dashboard home (roadmap step 2): who you are and your shop, from
// the API. The rest of the dashboard is still the approved mockup until its
// own roadmap step connects it.
export default function MerchantHomePage() {
  const t = useTranslations("App");
  const tType = useTranslations("BusinessType");
  const locale = useLocale();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<"checking" | "ready" | "offline">("checking");

  const load = useCallback(() => {
    setState("checking");
    getMe()
      .then((result) => {
        if (!result) return router.replace(`/${locale}/m/login`);
        if (!result.store) return router.replace(`/${locale}/m/onboarding`);
        setMe(result);
        setState("ready");
      })
      .catch(() => setState("offline"));
  }, [locale, router]);
  useEffect(load, [load]);

  async function signOut() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace(`/${locale}/m/login`);
  }

  if (state === "checking" || !me?.store) return state === "offline" ? <AppOffline onRetry={load} /> : <AppLoading />;
  const { store, merchant } = me;
  const trialEndsAt = store.subscription?.trialEndsAt ? new Date(store.subscription.trialEndsAt) : null;
  const trialDaysLeft = trialEndsAt ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / DAY_MS)) : null;

  return (
    <AppFrame
      aside={
        <Button variant="secondary" className="px-3 text-sm" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {t("signOut")}
        </Button>
      }
    >
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted">{t("homeGreeting", { name: merchant.firstName })}</p>
        <h1 className="text-2xl font-bold leading-normal">{store.name}</h1>
        <p className="text-sm text-muted">{tType(store.businessType)}</p>
      </div>

      <Card className="flex flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm text-muted">{t("shopLinkLabel")}</p>
            <p className="truncate font-medium">/s/{store.slug}</p>
          </div>
        </div>
        {trialDaysLeft !== null && store.subscription?.status === "trialing" && (
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted">{t("planLabel")}</p>
              <p className="font-medium">{t("planTrial", { count: trialDaysLeft })}</p>
            </div>
          </div>
        )}
      </Card>

      <Card className="flex flex-col gap-2 border-dashed p-4">
        <p className="font-semibold">{t("previewTitle")}</p>
        <p className="text-sm text-muted">{t("previewBody")}</p>
        <Link href={`/${locale}/mockup/dashboard`} className="flex min-h-touch items-center justify-between gap-2 text-sm font-medium text-brand">
          {t("openPreview")}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Card>
    </AppFrame>
  );
}
