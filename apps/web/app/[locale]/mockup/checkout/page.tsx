"use client";

import {
  convertKhrToUsdCents,
  convertUsdCentsToKhr,
  formatKhr,
  formatUsd,
  normalizeKhmerPhone,
  type Currency,
} from "@khmer-micro-store/shared";
import { Button, cn, Input, Select } from "@khmer-micro-store/ui";
import { Bike, Check, Footprints, MapPin } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRef, useState } from "react";
import type { RefObject } from "react";
import {
  getDiscountedUnitAmount,
  getEffectiveExchangeRate,
  getUnitAmount,
  lineKey,
  mockPaymentMethods,
  mockProducts,
  mockProvinces,
  mockStore,
  type MockPaymentMethodCode,
} from "@/mock/mock-data";
import { useCart } from "../cart-context";

type Fulfillment = "delivery" | "pickup";
type LocationStatus = "idle" | "loading" | "done" | "error";

export default function CheckoutMockupPage() {
  const t = useTranslations("Checkout");
  const tStore = useTranslations("Storefront");
  const tCart = useTranslations("Cart");
  const locale = useLocale();
  const { quantities, appliedPromo, setAppliedPromo } = useCart();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("delivery");
  const [provinceId, setProvinceId] = useState("");
  const [provinceError, setProvinceError] = useState<string | null>(null);
  const [khanId, setKhanId] = useState("");
  const [sangkatId, setSangkatId] = useState("");
  const [landmark, setLandmark] = useState("");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currency, setCurrency] = useState<Currency>(mockStore.defaultCurrency);
  const [paymentMethod, setPaymentMethod] = useState<MockPaymentMethodCode>(mockPaymentMethods[0]!.code);
  const [submitted, setSubmitted] = useState(false);

  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const provinceRef = useRef<HTMLSelectElement>(null);

  const rate = getEffectiveExchangeRate(mockStore);
  const province = mockProvinces.find((p) => p.id === provinceId);
  const khan = province?.khans.find((k) => k.id === khanId);

  const lines = mockProducts.flatMap((product) => {
    const title = locale === "km" ? product.titleKm : product.titleEn;
    if (product.variants?.length) {
      return product.variants.flatMap((variant) => {
        const key = lineKey(product.id, variant.id);
        const qty = quantities[key] ?? 0;
        if (qty === 0) return [];
        const base = getUnitAmount(product, currency, rate, variant) ?? 0;
        const discounted = getDiscountedUnitAmount(product, currency, rate, variant) ?? 0;
        const variantLabel = locale === "km" ? variant.labelKm : variant.labelEn;
        return [{ key, title: `${title} – ${variantLabel}`, qty, base, discounted }];
      });
    }
    const key = lineKey(product.id);
    const qty = quantities[key] ?? 0;
    if (qty === 0) return [];
    const base = getUnitAmount(product, currency, rate) ?? 0;
    const discounted = getDiscountedUnitAmount(product, currency, rate) ?? 0;
    return [{ key, title, qty, base, discounted }];
  });

  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0);
  const subtotal = lines.reduce((sum, line) => sum + line.base * line.qty, 0);
  const afterItemDiscount = lines.reduce((sum, line) => sum + line.discounted * line.qty, 0);
  const itemDiscount = subtotal - afterItemDiscount;

  const promoDiscount = !appliedPromo
    ? 0
    : appliedPromo.type === "percent"
      ? Math.round(afterItemDiscount * (appliedPromo.value / 100))
      : Math.min(
          currency === "USD" ? appliedPromo.value : convertUsdCentsToKhr(appliedPromo.value, rate),
          afterItemDiscount,
        );

  const goodsAfterDiscount = afterItemDiscount - promoDiscount;
  const vat = Math.round(goodsAfterDiscount * (mockStore.vatPercent / 100));
  const deliveryFee =
    fulfillment === "delivery"
      ? currency === "USD"
        ? mockStore.deliveryFeeUsdCents
        : convertUsdCentsToKhr(mockStore.deliveryFeeUsdCents, rate)
      : 0;
  const total = goodsAfterDiscount + vat + deliveryFee;
  const secondaryTotal = currency === "USD" ? convertUsdCentsToKhr(total, rate) : convertKhrToUsdCents(total, rate);
  const format = (amount: number, cur: Currency) => (cur === "USD" ? formatUsd(amount) : formatKhr(amount));

  function validateName(value: string): string | null {
    const trimmed = value.trim();
    return trimmed.length >= 2 && trimmed.length <= 60 ? null : t("nameError");
  }

  function handleUseLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus("done");
      },
      () => setLocationStatus("error"),
      { timeout: 10_000 },
    );
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

    const provinceMsg = fulfillment === "delivery" && !provinceId ? t("provinceError") : null;
    setProvinceError(provinceMsg);
    if (provinceMsg) failures.push({ ref: provinceRef as RefObject<HTMLElement> });

    if (failures.length > 0) {
      const first = failures[0]!.ref.current;
      first?.focus();
      first?.scrollIntoView({ behavior: "smooth", block: "center" });
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
      <h1 className="text-lg font-semibold">{t("title")}</h1>

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

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setFulfillment("delivery")}
          className={cn(
            "rounded-DEFAULT border-2 p-4 text-left transition-colors",
            fulfillment === "delivery" ? "border-brand bg-brand/5" : "border-border",
          )}
        >
          <Bike className="h-5 w-5 text-brand" aria-hidden="true" />
          <p className="mt-2 font-medium">{tStore("delivery")}</p>
          <p className="text-xs text-muted">{formatUsd(mockStore.deliveryFeeUsdCents)}</p>
        </button>
        <button
          type="button"
          onClick={() => setFulfillment("pickup")}
          className={cn(
            "rounded-DEFAULT border-2 p-4 text-left transition-colors",
            fulfillment === "pickup" ? "border-brand bg-brand/5" : "border-border",
          )}
        >
          <Footprints className="h-5 w-5 text-brand" aria-hidden="true" />
          <p className="mt-2 font-medium">{tStore("pickup")}</p>
          <p className="text-xs text-muted">{t("free")}</p>
        </button>
      </div>

      {fulfillment === "delivery" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-DEFAULT border border-dashed border-border bg-border/10 p-4 text-center text-sm text-muted">
            {locationStatus === "done" && coords
              ? t("locationSet", { lat: coords.lat.toFixed(5), lng: coords.lng.toFixed(5) })
              : t("locationPlaceholder")}
          </div>
          <Button
            variant="secondary"
            onClick={handleUseLocation}
            loading={locationStatus === "loading"}
            className="w-full"
          >
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {t("useMyLocation")}
          </Button>
          {locationStatus === "error" && <p className="text-sm text-danger">{t("locationError")}</p>}

          <Select
            ref={provinceRef}
            label={t("province")}
            placeholder={t("provincePlaceholder")}
            value={provinceId}
            onChange={(e) => {
              setProvinceId(e.target.value);
              setKhanId("");
              setSangkatId("");
              setProvinceError(null);
            }}
            options={mockProvinces.map((p) => ({
              value: p.id,
              label: locale === "km" ? p.nameKm : p.nameEn,
            }))}
            error={provinceError ?? undefined}
          />

          {province && (
            <Select
              label={t("khan")}
              placeholder={t("khanPlaceholder")}
              value={khanId}
              onChange={(e) => {
                setKhanId(e.target.value);
                setSangkatId("");
              }}
              options={province.khans.map((k) => ({
                value: k.id,
                label: locale === "km" ? k.nameKm : k.nameEn,
              }))}
            />
          )}

          {khan && (
            <Select
              label={t("sangkat")}
              placeholder={t("sangkatPlaceholder")}
              value={sangkatId}
              onChange={(e) => setSangkatId(e.target.value)}
              options={khan.sangkats.map((s) => ({
                value: s.id,
                label: locale === "km" ? s.nameKm : s.nameEn,
              }))}
            />
          )}

          <Input
            label={t("landmark")}
            placeholder={t("landmarkPlaceholder")}
            maxLength={200}
            value={landmark}
            onChange={(e) => setLandmark(e.target.value)}
          />
        </div>
      )}

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
          .filter((method) => method.code !== "cod" || mockStore.allowCod)
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
        {fulfillment === "delivery" && (
          <div className="flex items-center justify-between text-muted">
            <span>{t("deliveryFee")}</span>
            <span>{format(deliveryFee, currency)}</span>
          </div>
        )}
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
