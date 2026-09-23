"use client";

import { Button, Input } from "@khmer-micro-store/ui";
import { Check, PartyPopper, Send, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { mockTakenSlugs, slugify } from "@/mock/mock-data";

type SlugStatus = "idle" | "checking" | "available" | "taken";
type BakongStatus = "idle" | "checking" | "verified" | "error";
type TelegramStatus = "idle" | "checking" | "connected";

const TOTAL_STEPS = 4;

export default function OnboardingMockupPage() {
  const t = useTranslations("Onboarding");
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);

  // Step 1: shop name + slug
  const [shopName, setShopName] = useState("");
  const [shopNameError, setShopNameError] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle");

  // Step 2: logo (optional) — real client-side preview, no upload yet.
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);

  // Step 3: Bakong ID (required)
  const [bakongId, setBakongId] = useState("");
  const [bakongStatus, setBakongStatus] = useState<BakongStatus>("idle");

  // Step 4: Telegram group (optional)
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus>("idle");

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(shopName));
  }, [shopName, slugTouched]);

  // Mocks a real uniqueness lookup against the DB with a short debounce.
  useEffect(() => {
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    setSlugStatus("checking");
    const timer = setTimeout(() => {
      setSlugStatus(mockTakenSlugs.includes(slug) ? "taken" : "available");
    }, 500);
    return () => clearTimeout(timer);
  }, [slug]);

  function handleStep1Next() {
    if (shopName.trim().length < 2) {
      setShopNameError(t("shopNameError"));
      return;
    }
    if (slugStatus !== "available") return;
    setShopNameError(null);
    setStep(2);
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoDataUrl(reader.result as string);
    reader.readAsDataURL(file);
  }

  // Mocks Bakong's account-check API (see docs/blueprint.md merchant
  // onboarding section) — real check needs a Bakong Open API token.
  function handleBakongBlur() {
    if (!bakongId.trim()) {
      setBakongStatus("idle");
      return;
    }
    setBakongStatus("checking");
    setTimeout(() => {
      setBakongStatus(/^[^\s@]+@[^\s@]+$/.test(bakongId.trim()) ? "verified" : "error");
    }, 700);
  }

  // Mocks the bot auto-detecting it was added to the merchant's Telegram
  // group — real detection needs the Telegram Bot API webhook wired up.
  function handleConnectTelegram() {
    setTelegramStatus("checking");
    setTimeout(() => setTelegramStatus("connected"), 900);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(`/s/${slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. permission denied) — no-op.
    }
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shopName, url: `/s/${slug}` });
      } catch {
        // User cancelled the share sheet — no-op.
      }
    } else {
      handleCopyLink();
    }
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-4 bg-bg p-4 text-center text-fg">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
          <PartyPopper className="h-8 w-8 text-success" aria-hidden="true" />
        </span>
        <h1 className="text-xl font-bold">{t("doneTitle")}</h1>

        <div className="flex w-full items-center gap-3 rounded-DEFAULT border border-border p-3 text-left">
          {logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- local FileReader preview, not a remote image
            <img src={logoDataUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">
              {shopName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{shopName}</p>
            <p className="truncate text-xs text-muted">/s/{slug}</p>
          </div>
        </div>

        <div className="flex w-full gap-2">
          <Button variant="secondary" onClick={handleCopyLink} className="w-full">
            {copied ? t("linkCopied") : t("copyLink")}
          </Button>
          <Button variant="primary" onClick={handleShare} className="w-full">
            {t("shareLink")}
          </Button>
        </div>

        {(!logoDataUrl || telegramStatus !== "connected") && (
          <div className="w-full rounded-DEFAULT border border-dashed border-border p-3 text-left text-sm">
            <p className="mb-1 font-medium text-muted">{t("stillToDo")}</p>
            <ul className="flex flex-col gap-1 text-muted">
              {!logoDataUrl && <li>• {t("addLogoReminder")}</li>}
              {telegramStatus !== "connected" && <li>• {t("connectTelegramReminder")}</li>}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted">{t("dashboardNotBuilt")}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-6 bg-bg p-4 pb-24 text-fg">
      <div className="flex flex-col gap-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-border/30">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted">{t("stepLabel", { current: step, total: TOTAL_STEPS })}</span>
      </div>

      {step === 1 && (
        <div className="flex flex-1 flex-col gap-4">
          <h1 className="text-lg font-semibold">{t("step1Title")}</h1>
          <Input
            label={t("shopNameLabel")}
            placeholder={t("shopNamePlaceholder")}
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            error={shopNameError ?? undefined}
          />
          <Input
            label={t("slugLabel")}
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
            error={slugStatus === "taken" ? t("slugTaken") : undefined}
          />
          {slugStatus === "checking" && <p className="text-xs text-muted">{t("slugChecking")}</p>}
          {slugStatus === "available" && (
            <p className="flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {t("slugAvailable")}
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-1 flex-col items-center gap-4 text-center">
          <h1 className="text-lg font-semibold">{t("step2Title")}</h1>
          <p className="text-sm text-muted">{t("optionalNote")}</p>

          {logoDataUrl ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local FileReader preview, not a remote image */}
              <img src={logoDataUrl} alt="" className="h-24 w-24 rounded-full object-cover" />
              <button
                type="button"
                onClick={() => setLogoDataUrl(null)}
                aria-label={t("removeLogo")}
                className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-danger text-white"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand text-3xl font-bold text-white">
              {shopName.charAt(0).toUpperCase() || "?"}
            </div>
          )}

          <label className="flex min-h-touch w-full cursor-pointer items-center justify-center gap-2 rounded-DEFAULT border border-border text-sm font-medium">
            <Upload className="h-4 w-4" aria-hidden="true" />
            {t("uploadLogo")}
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </label>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-1 flex-col gap-4">
          <h1 className="text-lg font-semibold">{t("step3Title")}</h1>
          <Input
            label={t("bakongIdLabel")}
            placeholder={t("bakongIdPlaceholder")}
            value={bakongId}
            onChange={(e) => {
              setBakongId(e.target.value);
              setBakongStatus("idle");
            }}
            onBlur={handleBakongBlur}
            error={bakongStatus === "error" ? t("bakongIdError") : undefined}
          />
          {bakongStatus === "checking" && <p className="text-xs text-muted">{t("bakongIdVerifying")}</p>}
          {bakongStatus === "verified" && (
            <p className="flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {t("bakongIdVerified")}
            </p>
          )}
        </div>
      )}

      {step === 4 && (
        <div className="flex flex-1 flex-col items-center gap-4 text-center">
          <h1 className="text-lg font-semibold">{t("step4Title")}</h1>
          <p className="text-sm text-muted">{t("optionalNote")}</p>

          {telegramStatus === "connected" ? (
            <p className="flex items-center gap-1 text-success">
              <Check className="h-4 w-4" aria-hidden="true" />
              {t("telegramConnected")}
            </p>
          ) : (
            <Button
              variant="primary"
              onClick={handleConnectTelegram}
              loading={telegramStatus === "checking"}
              className="w-full"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {t("connectTelegram")}
            </Button>
          )}
        </div>
      )}

      <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[480px] gap-3 border-t border-border bg-bg p-3">
        {step > 1 && (
          <Button variant="secondary" onClick={() => setStep((s) => s - 1)} className="w-full">
            {t("back")}
          </Button>
        )}
        {step === 1 && (
          <Button variant="primary" onClick={handleStep1Next} className="w-full">
            {t("next")}
          </Button>
        )}
        {step === 2 && (
          <Button variant="primary" onClick={() => setStep(3)} className="w-full">
            {t("next")}
          </Button>
        )}
        {step === 3 && (
          <Button
            variant="primary"
            onClick={() => setStep(4)}
            disabled={bakongStatus !== "verified"}
            className="w-full"
          >
            {t("next")}
          </Button>
        )}
        {step === 4 && (
          <Button variant="primary" onClick={() => setDone(true)} className="w-full">
            {t("finish")}
          </Button>
        )}
      </div>
    </div>
  );
}
