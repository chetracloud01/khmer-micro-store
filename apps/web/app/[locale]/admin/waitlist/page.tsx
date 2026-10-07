"use client";

import { formatKhmerPhoneLocal, PLATFORM_PRODUCT_IDS, type PlatformProductId } from "@khmio/shared";
import { Button, Card, cn } from "@khmio/ui";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { AdminWaitlist } from "@/lib/admin-api";
import { api, ApiError } from "@/lib/api";
import { SITE_PRODUCTS } from "@/site/content";
import { LoadState, PageHeader, Pill, useDateText } from "../admin-ui";

const productName = (id: PlatformProductId) => SITE_PRODUCTS.find((product) => product.id === id)?.name ?? id;

// A14. The website waitlist (design/screens.md): who asked to hear when a
// coming-soon product opens, and how many per product — the evidence for
// choosing the second product (docs/platform-launch-plan.md Stage 5).
// Read-only. Owner and support only: it holds phone numbers.
export default function WaitlistPage() {
  const t = useTranslations("AdminApp");
  const tSite = useTranslations("Site");
  const { dateTime } = useDateText();
  const [product, setProduct] = useState<PlatformProductId | "">("");
  const [data, setData] = useState<AdminWaitlist | null>(null);
  const [failed, setFailed] = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback((filter: PlatformProductId | "", before?: string) => {
    setFailed(false);
    const query = new URLSearchParams({ ...(filter ? { product: filter } : {}), ...(before ? { before } : {}) }).toString();
    return api<AdminWaitlist>(`/admin/waitlist${query ? `?${query}` : ""}`).then(
      (page) => setData((previous) => (before && previous ? { ...page, signups: [...previous.signups, ...page.signups] } : page)),
      (error: unknown) => (error instanceof ApiError && error.status === 403 ? setNotAllowed(true) : setFailed(true)),
    );
  }, []);
  useEffect(() => {
    setData(null);
    void load(product);
  }, [product, load]);

  const businessType = (type: AdminWaitlist["signups"][number]["businessType"]) =>
    ({ teacher: tSite("waitlistTeacher"), school: tSite("waitlistSchool"), landlord: tSite("waitlistLandlord"), other: tSite("waitlistOther") })[type];

  if (notAllowed) {
    return (
      <div className="flex flex-col gap-4">
        <PageHeader title={t("waitlistTitle")} />
        <Card className="p-8 text-center text-sm text-muted">{t("waitlistNotAllowed")}</Card>
      </div>
    );
  }

  const filters: { value: PlatformProductId | ""; label: string }[] = [
    { value: "", label: t("waitlistAllProducts") },
    ...PLATFORM_PRODUCT_IDS.filter((id) => SITE_PRODUCTS.find((entry) => entry.id === id)?.status === "coming_soon").map((id) => ({
      value: id,
      label: `${productName(id)} · ${data?.counts[id] ?? 0}`,
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={t("waitlistTitle")} description={t("waitlistDescription")} />
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {filters.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={product === option.value}
            onClick={() => setProduct(option.value)}
            className={cn(
              "min-h-touch shrink-0 whitespace-nowrap rounded-full border px-4 text-sm font-medium",
              product === option.value ? "border-brand bg-brand text-on-brand" : "border-border bg-bg text-muted hover:text-fg",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!data ? (
        <LoadState failed={failed} onRetry={() => void load(product)} />
      ) : data.signups.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">{t("waitlistEmpty")}</Card>
      ) : (
        <Card className="p-0">
          <ul className="flex flex-col divide-y divide-border">
            {data.signups.map((signup) => (
              <li key={signup.id} className="flex flex-col gap-1 p-4 text-sm md:flex-row md:items-baseline md:gap-4">
                <span className="w-32 shrink-0 text-xs text-muted tabular-nums">{dateTime(signup.createdAt)}</span>
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-medium">{signup.name}</span>
                  <a href={`tel:+${signup.phone}`} className="inline-flex min-h-touch items-center text-brand tabular-nums md:min-h-0">
                    {formatKhmerPhoneLocal(signup.phone)}
                  </a>
                  <span className="text-muted">{businessType(signup.businessType)}</span>
                </span>
                <Pill className="self-start bg-brand/10 text-brand">{productName(signup.product)}</Pill>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {data?.more && (
        <Button
          variant="secondary"
          className="self-center"
          loading={loadingMore}
          onClick={() => {
            setLoadingMore(true);
            void load(product, data.signups[data.signups.length - 1]?.createdAt).finally(() => setLoadingMore(false));
          }}
        >
          {t("older")}
        </Button>
      )}
    </div>
  );
}
