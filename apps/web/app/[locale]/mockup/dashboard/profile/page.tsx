"use client";

import {
  BUSINESS_TYPES,
  businessTypeSchema,
  deliveryAreaSchema,
  formatKhmerPhoneLocal,
  storeProfileSchema,
  toFieldErrors,
  type BusinessType,
  type DeliveryArea,
  type FormErrorCode,
} from "@khmer-micro-store/shared";
import { Button, Card, Input, SegmentedControl, Select } from "@khmer-micro-store/ui";
import {
  Check,
  ChevronRight,
  CreditCard,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
  Upload,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { mockMerchant } from "@/mock/mock-data";
import { useAdmin } from "../../admin-context";
import { useMerchantAccount } from "../../merchant-account-context";
import { LoginMethods } from "./login-methods";
import { FormActions, FormSection, ReadOnlyField, focusFirstInvalidField, useFormErrorText } from "@/components/form-ui";
import { useMerchantProfile } from "../../merchant-profile-context";
import { useMerchantSubscription } from "../../merchant-subscription-context";

type BakongStatus = "idle" | "checking" | "verified" | "error";
type TelegramStatus = "idle" | "checking" | "connected";

interface Draft {
  shopName: string;
  businessType: BusinessType;
  phone: string;
  area: DeliveryArea;
  description: string;
  bakongId: string;
  logoDataUrl: string | null;
}

const BAKONG_ID_PATTERN = /^[^\s@]+@[^\s@]+$/;

// Waits for saved data so the draft below starts from the real saved values,
// not the pre-load empty ones.
export default function DashboardProfileMockupPage() {
  const { hydrated } = useMerchantProfile();
  return hydrated ? <ProfileForm /> : null;
}

// The standard form (see ../../form-ui.tsx): edits stay in a draft until Save,
// which runs storeProfileSchema — the same check the API will run.
function ProfileForm() {
  const t = useTranslations("DashboardProfile");
  const tType = useTranslations("BusinessType");
  const tPlan = useTranslations("Plans");
  const tKyc = useTranslations("Kyc");
  const { demoKycStatus } = useAdmin();
  const locale = useLocale();
  const { subscription } = useMerchantSubscription();
  const profile = useMerchantProfile();
  const errorText = useFormErrorText();
  const formRef = useRef<HTMLDivElement>(null);

  const saved: Draft = {
    shopName: profile.shopName,
    businessType: profile.businessType,
    phone: formatKhmerPhoneLocal(profile.phone),
    area: profile.area,
    description: profile.description,
    bakongId: profile.bakongId,
    logoDataUrl: profile.logoDataUrl,
  };
  const [draft, setDraft] = useState<Draft>(saved);
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, FormErrorCode>>>({});
  const [justSaved, setJustSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  // A Bakong ID saved before was already verified then, so show it as
  // verified immediately rather than re-running the mock check on load.
  const [bakongStatus, setBakongStatus] = useState<BakongStatus>(() =>
    BAKONG_ID_PATTERN.test(profile.bakongId.trim()) ? "verified" : "idle",
  );
  const [telegramStatus, setTelegramStatus] = useState<TelegramStatus>(
    profile.telegramConnected ? "connected" : "idle",
  );

  function update<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setJustSaved(false);
  }

  /** On leaving a field: show its problem now rather than waiting for Save. */
  function checkField(field: keyof Draft) {
    const result = storeProfileSchema.safeParse(draft);
    const code = result.success ? undefined : toFieldErrors(result.error)[field];
    setErrors((prev) => ({ ...prev, [field]: code }));
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update("logoDataUrl", reader.result as string);
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  // Mocks Bakong's account-check API — same stand-in as onboarding.
  function handleBakongBlur() {
    checkField("bakongId");
    if (!BAKONG_ID_PATTERN.test(draft.bakongId.trim())) {
      setBakongStatus("idle");
      return;
    }
    setBakongStatus("checking");
    setTimeout(() => setBakongStatus("verified"), 700);
  }

  // Mock of the Telegram Login Widget: links Telegram to this account, which
  // also sends order alerts to the merchant's private chat with the bot.
  const { telegramLogin, signIn } = useMerchantAccount();
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  function handleLinkTelegram() {
    setLinkingTelegram(true);
    setTimeout(() => {
      signIn({ method: "telegram", account: `@${mockMerchant.telegramUsername}` });
      setLinkingTelegram(false);
    }, 900);
  }

  // Mocks the bot auto-detecting it was added to the merchant's Telegram
  // group. An action, not a draft field.
  function handleConnectTelegram() {
    setTelegramStatus("checking");
    setTimeout(() => {
      setTelegramStatus("connected");
      profile.setTelegramConnected(true);
    }, 900);
  }

  function handleSave() {
    const result = storeProfileSchema.safeParse(draft);
    if (!result.success) {
      setErrors(toFieldErrors(result.error));
      focusFirstInvalidField(formRef.current);
      return;
    }
    const valid = result.data;
    profile.setShopName(valid.shopName);
    profile.setBusinessType(valid.businessType);
    profile.setPhone(valid.phone);
    profile.setArea(valid.area);
    profile.setDescription(valid.description);
    profile.setBakongId(valid.bakongId);
    profile.setLogoDataUrl(draft.logoDataUrl);
    // Show the cleaned-up values (trimmed, phone in local format) so the form matches what was saved.
    setDraft({ ...valid, phone: formatKhmerPhoneLocal(valid.phone), logoDataUrl: draft.logoDataUrl });
    setErrors({});
    setJustSaved(true);
  }

  function handleCancel() {
    setDraft(saved);
    setErrors({});
    setBakongStatus(BAKONG_ID_PATTERN.test(profile.bakongId.trim()) ? "verified" : "idle");
  }

  const status = dirty ? t("unsavedChanges") : justSaved ? t("saved") : undefined;
  const bakongError = errors.bakongId ? errorText(errors.bakongId) : bakongStatus === "error" ? t("bakongIdError") : undefined;

  return (
    <div ref={formRef} className="mx-auto flex max-w-[720px] flex-col gap-5 p-4 text-fg md:p-6">
      <h1 className="text-lg font-semibold">{t("title")}</h1>

      {/* The sidebar-only pages, reachable on phones from here. */}
      <nav aria-label={t("moreSettings")} className="overflow-hidden rounded-DEFAULT border border-border bg-bg shadow-card">
        {[
          { href: "delivery", icon: Truck, title: t("delivery"), detail: t("deliveryDetail") },
          { href: "settings", icon: SlidersHorizontal, title: t("storeSettings"), detail: t("storeSettingsDetail") },
          {
            href: "verification",
            icon: ShieldCheck,
            title: t("verification"),
            detail: tKyc(`statusShort_${demoKycStatus}`),
          },
          { href: "billing", icon: CreditCard, title: t("planAndBilling"), detail: tPlan(subscription.plan) },
        ].map((item) => (
          <Link
            key={item.href}
            href={`/${locale}/mockup/dashboard/${item.href}`}
            className="flex min-h-touch items-center gap-3 border-b border-border p-4 last:border-b-0 hover:bg-border/10"
          >
            <item.icon className="h-5 w-5 shrink-0 text-brand" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="truncate text-xs text-muted">{item.detail}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
          </Link>
        ))}
      </nav>

      <Card className="flex flex-col p-4 md:p-6">
        <FormSection id="details" stacked title={t("sectionShop")} description={t("sectionShopHelp")}>
          <div className="flex items-center gap-4">
            {draft.logoDataUrl ? (
              <div className="relative shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- local FileReader preview, not a remote image */}
                <img src={draft.logoDataUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
                <button
                  type="button"
                  onClick={() => update("logoDataUrl", null)}
                  aria-label={t("removeLogo")}
                  className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-danger text-bg"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-bold text-on-brand">
                {draft.shopName.trim().charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <label className="flex min-h-touch flex-1 cursor-pointer items-center justify-center gap-2 rounded-DEFAULT border border-border px-3 text-sm font-medium">
              <Upload className="h-4 w-4" aria-hidden="true" />
              {t("uploadLogo")}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoChange} />
            </label>
          </div>

          <Input
            label={t("shopNameLabel")}
            value={draft.shopName}
            onChange={(e) => update("shopName", e.target.value)}
            onBlur={() => checkField("shopName")}
            error={errorText(errors.shopName)}
          />

          <div className="flex flex-col gap-1.5">
            <Select
              label={t("businessTypeLabel")}
              value={draft.businessType}
              onChange={(e) => {
                const parsed = businessTypeSchema.safeParse(e.target.value);
                if (parsed.success) update("businessType", parsed.data);
              }}
              options={BUSINESS_TYPES.map((type) => ({ value: type, label: tType(type) }))}
            />
            <p className="text-xs text-muted">{t("businessTypeHint")}</p>
          </div>

          <ReadOnlyField label={t("shopLinkLabel")} value={`/s/${profile.slug}`} hint={t("shopLinkNote")} />

          <Input
            label={t("phoneLabel")}
            prefix="+855"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="012 345 678"
            value={draft.phone}
            onChange={(e) => update("phone", e.target.value)}
            onBlur={() => checkField("phone")}
            error={errorText(errors.phone)}
          />

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-fg">{t("areaLabel")}</span>
            <SegmentedControl
              value={draft.area}
              onChange={(next) => {
                const parsed = deliveryAreaSchema.safeParse(next);
                if (parsed.success) update("area", parsed.data);
              }}
              options={[
                { value: "phnom_penh", label: t("phnomPenh") },
                { value: "province", label: t("otherProvince") },
              ]}
            />
          </div>

          <Input
            label={t("descriptionLabel")}
            placeholder={t("descriptionPlaceholder")}
            maxLength={300}
            value={draft.description}
            onChange={(e) => update("description", e.target.value)}
            error={errorText(errors.description)}
          />
        </FormSection>

        <FormSection id="payments" stacked title={t("sectionPayments")} description={t("sectionPaymentsHelp")}>
          {!profile.bakongId && (
            <p className="flex items-start gap-2 rounded-DEFAULT border border-warning/40 bg-warning/5 p-3 text-sm">
              <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              {t("bakongMissing")}
            </p>
          )}
          <Input
            label={t("bakongIdLabel")}
            placeholder={t("bakongIdPlaceholder")}
            autoCapitalize="none"
            value={draft.bakongId}
            onChange={(e) => {
              update("bakongId", e.target.value);
              setBakongStatus("idle");
            }}
            onBlur={handleBakongBlur}
            error={bakongError}
          />
          {bakongStatus === "checking" && <p className="text-xs text-muted">{t("bakongIdVerifying")}</p>}
          {bakongStatus === "verified" && !bakongError && (
            <p className="flex items-center gap-1 text-xs text-success">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {t("bakongIdVerified")}
            </p>
          )}
        </FormSection>

        {/* Signed in with Telegram = alerts already work, in a private chat with the bot.
            A group is only for shops where staff should see orders too. */}
        <FormSection id="alerts" stacked title={t("sectionTelegram")} description={t("sectionTelegramHelp")}>
          {telegramLogin ? (
            <p className="flex items-start gap-2 text-sm">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
              {t("alertsToChat", { account: telegramLogin.account })}
            </p>
          ) : (
            <Button variant="primary" onClick={handleLinkTelegram} loading={linkingTelegram} className="w-full">
              <Send className="h-4 w-4" aria-hidden="true" />
              {t("connectTelegramAlerts")}
            </Button>
          )}
          {telegramStatus === "connected" ? (
            <p className="flex items-center gap-2 text-sm text-success">
              <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t("telegramConnected")}
            </p>
          ) : (
            <Button
              variant="secondary"
              onClick={handleConnectTelegram}
              loading={telegramStatus === "checking"}
              className="w-full"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              {t("connectGroup")}
            </Button>
          )}
        </FormSection>

        <FormActions
          dirty={dirty}
          onCancel={handleCancel}
          onSave={handleSave}
          saveLabel={t("saveChanges")}
          cancelLabel={t("cancel")}
          status={status}
          className="bottom-above-nav -mb-4 rounded-b-DEFAULT md:bottom-0 md:-mb-6"
        />
      </Card>

      <LoginMethods />
    </div>
  );
}
