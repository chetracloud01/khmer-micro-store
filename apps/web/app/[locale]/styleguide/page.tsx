"use client";

import { Button, Card, Input, PriceTag } from "@khmer-micro-store/ui";
import { useTranslations } from "next-intl";
import { useState } from "react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border pb-6">
      <h2 className="text-lg font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`h-14 w-14 rounded-DEFAULT ${className}`} />
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

export default function StyleguidePage() {
  const t = useTranslations("Styleguide");
  const [loading, setLoading] = useState(false);

  return (
    <main className="mx-auto flex max-w-[360px] flex-col gap-6 bg-bg p-4 pb-12 text-fg">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Section title={t("colors")}>
        <div className="flex gap-4">
          <Swatch label={t("colorBrand")} className="bg-brand" />
          <Swatch label={t("colorSuccess")} className="bg-success" />
          <Swatch label={t("colorDanger")} className="bg-danger" />
        </div>
      </Section>

      <Section title={t("typography")}>
        <p className="font-khmer text-base leading-relaxed">{t("typographySampleKhmer")}</p>
        <p className="text-base leading-relaxed">{t("typographySample")}</p>
      </Section>

      <Section title={t("buttons")}>
        <Button variant="primary" fullWidth>
          {t("buttonPrimary")}
        </Button>
        <Button variant="secondary" fullWidth>
          {t("buttonSecondary")}
        </Button>
        <Button variant="danger" fullWidth>
          {t("buttonDanger")}
        </Button>
        <Button
          variant="primary"
          fullWidth
          loading={loading}
          onClick={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 1500);
          }}
        >
          {loading ? t("buttonLoading") : t("buttonPrimary")}
        </Button>
      </Section>

      <Section title={t("inputs")}>
        <Input label={t("nameLabel")} placeholder={t("namePlaceholder")} />
        <Input label={t("phoneLabel")} prefix="+855" inputMode="tel" error={t("phoneError")} />
      </Section>

      <Section title={t("cards")}>
        <Card className="flex items-center justify-between">
          <span className="font-medium">{t("cardDeliveryTitle")}</span>
          <span className="text-sm text-muted">{t("cardDeliveryFee")}</span>
        </Card>
        <Card className="flex items-center justify-between">
          <span className="font-medium">{t("cardPickupTitle")}</span>
          <span className="text-sm text-muted">{t("cardPickupFee")}</span>
        </Card>
      </Section>

      <Section title={t("prices")}>
        <PriceTag usdCents={850} khr={34850} />
        <PriceTag usdCents={500} />
        <PriceTag khr={20000} />
      </Section>
    </main>
  );
}
