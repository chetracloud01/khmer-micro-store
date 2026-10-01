"use client";

import {
  BUSINESS_TYPES,
  SHARE_REQUIREMENTS,
  shopNameSchema,
  shopSlugSchema,
  suggestShopSlug,
  toFieldErrors,
  type BusinessType,
  type ShareRequirement,
} from "@khmer-micro-store/shared";
import { Button, cn, Input, SegmentedControl } from "@khmer-micro-store/ui";
import {
  Check,
  ChevronRight,
  Download,
  LayoutGrid,
  PartyPopper,
  Store,
  Upload,
  UtensilsCrossed,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { mockTakenSlugs, slugify } from "@/mock/mock-data";
import { ACCEPTED_IMAGE_TYPES, compressImage } from "../compress-image";
import { useFormErrorText } from "../form-ui";
import { useMerchantAccount } from "../merchant-account-context";
import { useMerchantProfile } from "../merchant-profile-context";
import { useShopReadiness, useStartNewShop } from "../new-shop";

/** Where each thing a shop needs before sharing is done. */
const REQUIREMENT_HREF: Record<ShareRequirement, string> = {
  products: "dashboard/products/new",
  phone: "dashboard/profile#details",
  delivery: "dashboard/delivery",
  payment: "dashboard/profile#payments",
};

type SlugStatus = "idle" | "checking" | "available" | "taken";

/**
 * Two short questions, then the shop is live (docs/blueprint.md "Merchant
 * onboarding"). Getting paid (Bakong ID) and order alerts are finished later
 * from the dashboard checklist, so a new seller is never blocked on a form.
 */
const INPUT_STEPS = 2;

const BUSINESS_TYPE_ICONS: Record<BusinessType, LucideIcon> = {
  shop: Store,
  restaurant: UtensilsCrossed,
  service: Wrench,
  other: LayoutGrid,
};

export default function OnboardingMockupPage() {
  const t = useTranslations("Onboarding");
  const tType = useTranslations("BusinessType");
  const tReady = useTranslations("Readiness");
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  // Step 1: business type — only pre-fills defaults, see handleFinish.
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);

  // Step 2: shop name, link, and an optional logo.
  const [shopName, setShopName] = useState("");
  const [shopNameError, setShopNameError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");
  const [slugError, setSlugError] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const errorText = useFormErrorText();

  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const merchantProfile = useMerchantProfile();
  const { logins } = useMerchantAccount();
  const startNewShop = useStartNewShop();
  const readiness = useShopReadiness();

  // A link can only use English letters, so a name in Khmer gives none: then
  // the seller gets one from their login instead of an empty box.
  const nameGivesNoLink = shopName.trim().length > 0 && slugify(shopName) === "";
  const loginSlug = suggestShopSlug({
    telegramUsername: logins.find((login) => login.method === "telegram")?.account,
    phone: logins.find((login) => login.method === "phone")?.account,
  });
  useEffect(() => {
    if (slugTouched) return;
    const fromName = slugify(shopName);
    setSlug(fromName || (shopName.trim() ? loginSlug : ""));
  }, [shopName, slugTouched, loginSlug]);

  // Real QR code: it just encodes the shop's public link, so no backend is
  // needed to generate it (unlike the KHQR payment code, which is mocked).
  useEffect(() => {
    if (!done || !slug) return;
    const shopUrl = `${window.location.origin}/s/${slug}`;
    QRCode.toDataURL(shopUrl, { width: 240, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [done, slug]);

  // Mocks a real uniqueness lookup against the DB with a short debounce.
  // Only a link that passes the shared rule is worth looking up.
  useEffect(() => {
    if (!shopSlugSchema.safeParse(slug).success) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const timer = setTimeout(() => {
      setSlugStatus(mockTakenSlugs.includes(slug) ? "taken" : "available");
    }, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    compressImage(file, 512)
      .then(setLogoDataUrl)
      .catch(() => setLogoDataUrl(null));
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/s/${slug}`);
      merchantProfile.setLinkShared(true);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. permission denied) — no-op.
    }
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shopName, url: `${window.location.origin}/s/${slug}` });
        merchantProfile.setLinkShared(true);
      } catch {
        // User cancelled the share sheet — no-op.
      }
    } else {
      handleCopyLink();
    }
  }

  function handleDownloadQr() {
    if (!qrDataUrl) return;
    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `${slug}-qr.png`;
    link.click();
  }

  // Same rules as the shop profile and the API (packages/shared store.ts).
  // Carries what onboarding collected into the shared profile; everything
  // else (Bakong ID, phone, area, description) is added later from the dashboard.
  function handleFinish() {
    const nameOk = shopNameSchema.safeParse(shopName).success;
    const slugResult = shopSlugSchema.safeParse(slug);
    setShopNameError(nameOk ? null : t("shopNameError"));
    // An empty link gets its own message: "too short" would send the seller to the wrong box.
    setSlugError(slug === "" ? t("slugRequired") : slugResult.success ? null : (errorText(toFieldErrors(slugResult.error)[""]) ?? null));
    if (!nameOk || !slugResult.success || slugStatus !== "available") return;

    const type = businessType ?? "other";
    merchantProfile.setBusinessType(type);
    // The seller's own shop starts empty — the sample shop's products, orders and drivers aren't theirs.
    startNewShop(type);
    // Logged in with a phone number: that's the shop's phone until they change it.
    const loginPhone = logins.find((login) => login.method === "phone")?.account;
    if (loginPhone && !merchantProfile.phone) merchantProfile.setPhone(loginPhone);
    merchantProfile.setShopName(shopName.trim());
    merchantProfile.setSlug(slug);
    merchantProfile.setLogoDataUrl(logoDataUrl);
    setDone(true);
  }

  const languageSwitch = (
    <SegmentedControl
      value={locale}
      onChange={(next) => router.push(`/${next}/mockup/onboarding`)}
      options={[
        { value: "km", label: "ខ្មែរ" },
        { value: "en", label: "EN" },
      ]}
    />
  );

  if (done) {
    const base = `/${locale}/mockup/`;
    return (
      <div className="min-h-dvh bg-canvas text-fg">
        <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center gap-4 bg-bg p-4 pb-8 text-center md:border-x md:border-border">
          <div className="self-end">{languageSwitch}</div>
          <span className="flex h-16 w-16 animate-sheet-in items-center justify-center rounded-full bg-success/10 motion-reduce:animate-none">
            <PartyPopper className="h-8 w-8 text-success" aria-hidden="true" />
          </span>
          <h1 className="text-xl font-bold">{t("doneTitle")}</h1>

          <div className="flex w-full items-center gap-3 rounded-2xl border border-border p-3 text-left">
            {logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local preview of the merchant's own logo
              <img src={logoDataUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-on-brand">
                {shopName.trim().charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{shopName}</p>
              <p className="truncate text-xs text-muted">/s/{slug}</p>
            </div>
          </div>

          {/* Sharing waits until a buyer who opens the link can actually order (packages/shared shop-readiness.ts). */}
          {!readiness.ready && (
            <div className="flex w-full flex-col gap-2 rounded-2xl border border-border p-3 text-left">
              <div>
                <p className="text-sm font-semibold">{tReady("title")}</p>
                <p className="text-sm text-muted">{tReady("intro")}</p>
              </div>
              <ul className="flex flex-col gap-1">
                {SHARE_REQUIREMENTS.map((requirement, index) => {
                  const met = !readiness.missing.includes(requirement);
                  return (
                    <li key={requirement}>
                      <Link
                        href={base + REQUIREMENT_HREF[requirement]}
                        aria-disabled={met}
                        className={cn(
                          "flex min-h-touch items-center gap-3 rounded-DEFAULT px-2 py-2",
                          met ? "pointer-events-none" : "hover:bg-border/10",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                            met ? "bg-success/10 text-success" : "bg-border/30 text-muted",
                          )}
                        >
                          {met ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}
                        </span>
                        <span className={cn("min-w-0 flex-1 text-sm", met ? "text-muted line-through" : "font-medium")}>
                          {tReady(requirement === "products" && businessType === "service" ? "req_products_service" : `req_${requirement}`)}
                        </span>
                        {!met && <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {readiness.ready && (
            <div className="flex w-full flex-col items-center gap-2 rounded-2xl border border-border p-3">
              <p className="text-sm font-medium">{t("showQrTitle")}</p>
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- locally generated data URL, not a remote image
                <img src={qrDataUrl} alt="" className="h-40 w-40" />
              ) : (
                <div className="h-40 w-40 animate-pulse rounded-DEFAULT bg-border/30" />
              )}
              <p className="text-xs text-muted">{t("qrScanHint")}</p>
              <Button variant="secondary" onClick={handleDownloadQr} disabled={!qrDataUrl} className="w-full">
                <Download className="h-4 w-4" aria-hidden="true" />
                {t("downloadQr")}
              </Button>
            </div>

          )}

          {readiness.ready && (
            <div className="grid w-full grid-cols-2 gap-2">
              <Button variant="secondary" onClick={handleCopyLink} className="w-full">
                {copied ? t("linkCopied") : t("copyLink")}
              </Button>
              <Button variant="secondary" onClick={handleShare} className="w-full">
                {t("shareLink")}
              </Button>
            </div>
          )}

          <Link href={`/${locale}/mockup/dashboard`} className="block w-full">
            <Button variant="primary" className="w-full">
              {t("goToDashboard")}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col gap-6 bg-bg p-4 pb-28 md:border-x md:border-border">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-border/30">
              <div
                className="h-full rounded-full bg-brand transition-all motion-reduce:transition-none"
                style={{ width: `${(step / INPUT_STEPS) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted">{t("stepLabel", { current: step, total: INPUT_STEPS })}</span>
          </div>
          {languageSwitch}
        </div>

        {step === 1 && (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold">{t("businessStepTitle")}</h1>
              <p className="text-sm text-muted">{t("businessStepHint")}</p>
            </div>
            <div role="radiogroup" aria-label={t("businessStepTitle")} className="grid grid-cols-2 gap-3">
              {BUSINESS_TYPES.map((type) => {
                const Icon = BUSINESS_TYPE_ICONS[type];
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
          </section>
        )}

        {step === 2 && (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold">{t("nameStepTitle")}</h1>
              <p className="text-sm text-muted">{t("nameStepHint")}</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                {logoDataUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the merchant's own logo */}
                    <img src={logoDataUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setLogoDataUrl(null)}
                      aria-label={t("removeLogo")}
                      className="absolute -right-3 -top-3 flex h-11 w-11 items-center justify-center"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-danger text-bg">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-2xl font-bold text-on-brand">
                    {shopName.trim().charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </div>
              <label className="flex min-h-touch flex-1 cursor-pointer items-center justify-center gap-2 rounded-DEFAULT border border-dashed border-border px-3 text-sm font-medium">
                <Upload className="h-4 w-4" aria-hidden="true" />
                {t("uploadLogoOptional")}
                <input type="file" accept={ACCEPTED_IMAGE_TYPES} className="hidden" onChange={handleLogoChange} />
              </label>
            </div>

            <Input
              label={t("shopNameLabel")}
              placeholder={t("shopNamePlaceholder")}
              autoFocus
              value={shopName}
              onChange={(e) => {
                setShopName(e.target.value);
                setShopNameError(null);
                setSlugError(null);
              }}
              onBlur={() => setShopNameError(shopNameSchema.safeParse(shopName).success ? null : t("shopNameError"))}
              error={shopNameError ?? undefined}
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
                  setSlugError(null);
                }}
                error={slugError ?? (slugStatus === "taken" ? t("slugTaken") : undefined)}
              />
              {nameGivesNoLink && !slugTouched && slug !== "" && <p className="text-sm text-muted">{t("slugFromKhmerHint")}</p>}
              {slugStatus === "checking" && <p className="text-xs text-muted">{t("slugChecking")}</p>}
              {slugStatus === "available" && !slugError && (
                <p className="flex items-center gap-1 text-xs text-success">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("slugAvailable")}
                </p>
              )}
            </div>
          </section>
        )}

        <div className="fixed inset-x-0 bottom-0 z-20">
          <div className="pb-safe mx-auto flex max-w-[480px] gap-3 border-t border-border bg-bg px-4 pt-3 md:border-x">
            {step > 1 && (
              <Button variant="secondary" onClick={() => setStep(1)} className="w-full">
                {t("back")}
              </Button>
            )}
            {step === 1 ? (
              <Button variant="primary" onClick={() => setStep(2)} disabled={!businessType} className="w-full">
                {t("next")}
              </Button>
            ) : (
              <Button variant="primary" onClick={handleFinish} className="w-full">
                {t("finish")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
