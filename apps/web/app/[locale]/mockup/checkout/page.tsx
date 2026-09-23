"use client";

import { formatKhr, formatUsd, normalizeKhmerPhone, type Currency } from "@khmer-micro-store/shared";
import { Button, cn, Input } from "@khmer-micro-store/ui";
import { ArrowLeft, Check } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { mockPaymentMethods, mockStore, type MockPaymentMethodCode } from "@/mock/mock-data";
import { useCart } from "../cart-context";
import { useCheckoutTotal } from "../use-checkout-total";

export default function CheckoutMockupPage() {
  const t = useTranslations("Checkout");
  const tStore = useTranslations("Storefront");
  const tCart = useTranslations("Cart");
  const locale = useLocale();
  const router = useRouter();
  const {
    quantities,
    appliedPromo,
    setAppliedPromo,
    currency,
    setCurrency,
    name,
    setName,
    phone,
    setPhone,
    area,
    setArea,
    landmark,
    setLandmark,
  } = useCart();

  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<MockPaymentMethodCode>(mockPaymentMethods[0]!.code);
  const [submitted, setSubmitted] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);

  // Cash on delivery only works where the merchant's own driver collects it;
  // orders to other provinces go through a transport company and must be
  // prepaid. Toggling area away from Phnom Penh (or the merchant disabling
  // COD outright) drops it from the payment method list below.
  const codAvailable = mockStore.allowCod && area === "phnom_penh";

  useEffect(() => {
    if (paymentMethod === "cod" && !codAvailable) {
      setPaymentMethod(mockPaymentMethods[0]!.code);
    }
  }, [codAvailable, paymentMethod]);

  const { itemCount, subtotal, itemDiscount, promoDiscount, deliveryFee, vat, total, secondaryTotal } =
    useCheckoutTotal(quantities, locale, appliedPromo, currency);
  const format = (amount: number, cur: Currency) => (cur === "USD" ? formatUsd(amount) : formatKhr(amount));

  function validateName(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length >= 2 && trimmed.length <= 60 ? null : t("nameError");
  }

  function handleSubmit() {
    const failures: { ref: RefObject<HTMLElement>; }[] = [];

    const nameMsg = validateName(name);
    setNameError(nameMsg);
    if (nameMsg) failures.push({ ref: nameRef as RefObject<HTMLElement> });

    const normalizedPhone = normalizeKhmerPhone(phone);
    const phoneMsg = normalizedPhone ? null : t("phoneError");
    setPhoneError(phoneMsg);
    if (phoneMsg) failures.push({ ref: phoneRef as RefObject<HTMLElement> });

    if (failures.length > 0) {
      const first = failures[0]!.ref.current;
      first?.focus();
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (paymentMethod === "khqr") {
      router.push(`/${locale}/mockup/khqr`);
      return;
    }

    setSubmitted(true);
  }

  if (itemCount === 0 && !submitted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-3 bg-bg p-4 text-center text-fg">
        <p className="text-sm text-muted">{tCart("empty")}</p>
        <Link href={`/${locale}/mockup/storefront`}>
          <Button variant="primary">{tCart("browseMenu")}</Button>
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-3 bg-bg p-4 text-center text-fg">
        <Check className="h-10 w-10 text-success" aria-hidden="true" />
        <p className="text-lg font-semibold">{t("submittedTitle")}</p>
        <p className="text-sm text-muted">{t("submittedBody")}</p>
        <Link href={`/${locale}/mockup/cart`}>
          <Button variant="secondary">{t("backToCart")}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col gap-4 bg-bg p-4 pb-28 text-fg">
      <div className="flex items-center gap-3">
        <Link
          href={`/${locale}/mockup/cart`}
          aria-label={t("backToCart")}
          className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-border/30"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <h1 className="text-lg font-semibold">{t("title")}</h1>
      </div>

      <Input
        ref={nameRef}
        label={t("name")}
        placeholder={t("namePlaceholder")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => setNameError(validateName(name))}
        error={nameError ?? undefined}
      />

      <Input
        ref={phoneRef}
        label={t("phone")}
        prefix="+855"
        inputMode="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        onBlur={() => setPhoneError(normalizeKhmerPhone(phone) ? null : t("phoneError"))}
        error={phoneError ?? undefined}
      />

      {/*
       * No fee label shown here: the delivery fee is seller-configured
       * (merchant Settings/admin panel, not yet built). It still applies to
       * the total below via mockStore.deliveryFeeUsdCents once that's wired
       * to real settings. Pickup was removed — delivery is the only
       * fulfillment method for now.
       */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-fg">{t("area")}</span>
          <div className="inline-flex w-fit items-center gap-1 rounded-full border border-border bg-border/10 p-1">
            <button
              type="button"
              onClick={() => setArea("phnom_penh")}
              className={cn(
                "min-h-touch rounded-full px-4 text-sm font-medium transition-colors",
                area === "phnom_penh" ? "bg-brand text-white" : "text-muted hover:text-fg",
              )}
            >
              {t("phnomPenh")}
            </button>
            <button
              type="button"
              onClick={() => setArea("province")}
              className={cn(
                "min-h-touch rounded-full px-4 text-sm font-medium transition-colors",
                area === "province" ? "bg-brand text-white" : "text-muted hover:text-fg",
              )}
            >
              {t("otherProvince")}
            </button>
          </div>
        </div>

        <Input
          label={t("landmark")}
          placeholder={t("landmarkPlaceholder")}
          maxLength={200}
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
        />

        {area === "province" && <p className="text-xs text-muted">{t("provinceCodNote")}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-fg">{t("payIn")}</span>
        <div className="inline-flex w-fit items-center gap-1 rounded-full border border-border bg-border/10 p-1">
          {(["USD", "KHR"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCurrency(option)}
              className={cn(
                "min-h-touch rounded-full px-4 text-sm font-medium transition-colors",
                currency === option ? "bg-brand text-white" : "text-muted hover:text-fg",
              )}
            >
              {option === "USD" ? "$" : "៛"} {option}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-fg">{t("paymentMethod")}</span>
        {mockPaymentMethods
          .filter((method) => method.code !== "cod" || codAvailable)
          .map((method) => (
            <button
              key={method.code}
              type="button"
              onClick={() => setPaymentMethod(method.code)}
              className={cn(
                "flex min-h-touch items-center justify-between rounded-DEFAULT border-2 px-4 text-left transition-colors",
                paymentMethod === method.code ? "border-brand bg-brand/5" : "border-border",
              )}
            >
              <span className="font-medium">{locale === "km" ? method.labelKm : method.labelEn}</span>
              {paymentMethod === method.code && <Check className="h-4 w-4 text-brand" aria-hidden="true" />}
            </button>
          ))}
      </div>

      {appliedPromo && (
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-success">
            {tStore("promoApplied", { code: appliedPromo.code })}
          </span>
          <button
            type="button"
            onClick={() => setAppliedPromo(null)}
            className="text-xs text-muted underline"
          >
            {tStore("remove")}
          </button>
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-border pt-3 text-sm">
        <div className="flex items-center justify-between text-muted">
          <span>{tStore("subtotal")}</span>
          <span>{format(subtotal, currency)}</span>
        </div>
        {itemDiscount > 0 && (
          <div className="flex items-center justify-between text-success">
            <span>{tStore("itemDiscount")}</span>
            <span>-{format(itemDiscount, currency)}</span>
          </div>
        )}
        {promoDiscount > 0 && (
          <div className="flex items-center justify-between text-success">
            <span>{tStore("promoDiscount")}</span>
            <span>-{format(promoDiscount, currency)}</span>
          </div>
        )}
        <div className="flex items-center justify-between text-muted">
          <span>{t("deliveryFee")}</span>
          <span>{format(deliveryFee, currency)}</span>
        </div>
        <div className="flex items-center justify-between text-muted">
          <span>{tStore("vat", { percent: mockStore.vatPercent })}</span>
          <span>{format(vat, currency)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-1">
          <span className="font-semibold text-fg">{tStore("totalToPay")}</span>
          <span className="text-right">
            <span className="block font-semibold text-fg">{format(total, currency)}</span>
            <span className="block text-xs text-muted">
              {format(secondaryTotal, currency === "USD" ? "KHR" : "USD")}
            </span>
          </span>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 mx-auto max-w-[480px] border-t border-border bg-bg p-3 shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <Button variant="primary" className="w-full" onClick={handleSubmit}>
          {t("placeOrder")} · {format(total, currency)}
        </Button>
      </div>
    </div>
  );
}
