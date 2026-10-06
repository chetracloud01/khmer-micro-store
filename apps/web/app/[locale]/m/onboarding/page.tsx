"use client";

import {
  BUSINESS_TYPES,
  createStoreInputSchema,
  slugify,
  suggestShopSlug,
  toFieldErrors,
  type BusinessType,
  type FormErrorCode,
} from "@khmio/shared";
import { Button, cn, Input } from "@khmio/ui";
import { Check, LayoutGrid, Store, UtensilsCrossed, Wrench, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError, getMe, type Me } from "@/lib/api";
import { AppFrame, AppLoading, AppOffline } from "../app-frame";

const ICONS: Record<BusinessType, LucideIcon> = { shop: Store, restaurant: UtensilsCrossed, service: Wrench, other: LayoutGrid };
type SlugState = "idle" | "checking" | "available" | "taken" | "invalid";

// Real onboarding (roadmap step 2): the same two questions as the approved
// mockup, saved by the API. Logo, phone, delivery and payment come later from
// the dashboard checklist.
export default function OnboardingPage() {
  const t = useTranslations("Onboarding");
  const tType = useTranslations("BusinessType");
  const tError = useTranslations("FormErrors");
  const tApp = useTranslations("App");
  const locale = useLocale();
  const router = useRouter();

  const [me, setMe] = useState<Me | null>(null);
  const [state, setState] = useState<"checking" | "ready" | "offline">("checking");
  const [step, setStep] = useState<1 | 2>(1);
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);
  const [shopName, setShopName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState<SlugState>("idle");
  const [errors, setErrors] = useState<Partial<Record<string, FormErrorCode>>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setState("checking");
    getMe()
      .then((result) => {
        if (!result) return router.replace(`/${locale}/m/login`);
        if (result.store) return router.replace(`/${locale}/m`);
        setMe(result);
        setState("ready");
      })
      .catch(() => setState("offline"));
  }, [locale, router]);
  useEffect(load, [load]);

  // A name in Khmer gives no link (links use English letters): suggest one from the Telegram username.
  const nameGivesNoLink = shopName.trim().length > 0 && slugify(shopName) === "";
  useEffect(() => {
    if (slugTouched) return;
    const fromName = slugify(shopName);
    setSlug(fromName || (shopName.trim() ? suggestShopSlug({ telegramUsername: me?.merchant.telegramUsername ?? undefined }) : ""));
  }, [shopName, slugTouched, me]);

  // Ask the API whether the link is free, a moment after the seller stops typing.
  useEffect(() => {
    if (!slug) return setSlugState("idle");
    setSlugState("checking");
    const timer = setTimeout(() => {
      api<{ available: boolean; reason?: "taken" | "invalid" }>(`/stores/slug-available?slug=${encodeURIComponent(slug)}`)
        .then((result) => setSlugState(result.available ? "available" : (result.reason ?? "invalid")))
        .catch(() => setSlugState("idle"));
    }, 400);
    return () => clearTimeout(timer);
  }, [slug]);

  async function finish() {
    const input = { businessType, shopName, slug };
    const parsed = createStoreInputSchema.safeParse(input);
    if (!parsed.success) {
      const found = toFieldErrors(parsed.error);
      setErrors(slug === "" ? { ...found, slug: undefined } : found);
      return;
    }
    if (slugState === "taken") return setErrors({ slug: "slug_taken" });
    setBusy(true);
    try {
      await api("/stores", { method: "POST", body: parsed.data });
      router.replace(`/${locale}/m`);
    } catch (caught) {
      setBusy(false);
      if (caught instanceof ApiError && caught.code === "invalid_input") return setErrors(caught.fields);
      if (caught instanceof ApiError && caught.status === 409) return router.replace(`/${locale}/m`);
      setErrors({ form: "required" });
    }
  }

  if (state === "checking") return <AppLoading />;
  if (state === "offline") return <AppOffline onRetry={load} />;

  const slugError = slug === "" && errors.slug === undefined && Object.keys(errors).length > 0 ? t("slugRequired") : errors.slug ? tError(errors.slug) : slugState === "taken" ? t("slugTaken") : undefined;

  return (
    <AppFrame aside={<span className="text-sm text-muted">{t("stepLabel", { current: step, total: 2 })}</span>}>
      <div className="h-2 overflow-hidden rounded-full bg-border/30" aria-hidden="true">
        <div className="h-full rounded-full bg-brand transition-all motion-reduce:transition-none" style={{ width: `${step * 50}%` }} />
      </div>

      {step === 1 ? (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">{t("businessStepTitle")}</h1>
            <p className="text-sm text-muted">{t("businessStepHint")}</p>
          </div>
          <div role="radiogroup" aria-label={t("businessStepTitle")} className="grid grid-cols-2 gap-3">
            {BUSINESS_TYPES.map((type) => {
              const Icon = ICONS[type];
              const selected = businessType === type;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setBusinessType(type)}
                  className={cn(
                    "flex min-h-touch flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-colors",
                    selected ? "border-brand bg-brand/10" : "border-border hover:bg-border/10",
                  )}
                >
                  <Icon className={cn("h-7 w-7", selected ? "text-brand" : "text-muted")} aria-hidden="true" />
                  <span className="text-sm font-semibold">{tType(type)}</span>
                  <span className="text-xs text-muted">{tType(`${type}Hint`)}</span>
                </button>
              );
            })}
          </div>
          <Button variant="primary" className="w-full" disabled={!businessType} onClick={() => setStep(2)}>
            {t("next")}
          </Button>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-bold">{t("nameStepTitle")}</h1>
            <p className="text-sm text-muted">{t("nameStepHint")}</p>
          </div>
          <Input
            label={t("shopNameLabel")}
            placeholder={t("shopNamePlaceholder")}
            autoFocus
            value={shopName}
            onChange={(e) => {
              setShopName(e.target.value);
              setErrors({});
            }}
            error={errors.shopName ? t("shopNameError") : undefined}
          />
          <div className="flex flex-col gap-1.5">
            <Input
              label={t("slugLabel")}
              prefix="/s/"
              autoCapitalize="none"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
                setErrors({});
              }}
              error={slugError}
            />
            {nameGivesNoLink && !slugTouched && slug !== "" && <p className="text-sm text-muted">{t("slugFromKhmerHint")}</p>}
            {slugState === "checking" && <p className="text-sm text-muted">{t("slugChecking")}</p>}
            {slugState === "available" && !slugError && (
              <p className="flex items-center gap-1 text-sm text-success">
                <Check className="h-4 w-4" aria-hidden="true" />
                {t("slugAvailable")}
              </p>
            )}
          </div>
          {errors.form && (
            <p role="alert" className="text-sm text-danger">
              {tApp("saveFailed")}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>
              {t("back")}
            </Button>
            <Button variant="primary" disabled={busy} onClick={() => void finish()}>
              {t("finish")}
            </Button>
          </div>
        </section>
      )}
    </AppFrame>
  );
}
