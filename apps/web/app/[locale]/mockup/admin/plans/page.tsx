"use client";

import {
  BILLING_PERIOD_DAYS,
  formatKhr,
  formatUsd,
  GRACE_PERIOD_DAYS,
  INVOICE_LEAD_DAYS,
  PLAN_ORDER,
  PLANS,
  planHasFeature,
  type PlanFeature,
} from "@khmer-micro-store/shared";
import { Card } from "@khmer-micro-store/ui";
import { Check, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import { PageHeader, SectionTitle } from "../admin-ui";

const FEATURES: { key: PlanFeature; label: "featureStock" | "featureWholesale" | "featureWarehouses" }[] = [
  { key: "stock", label: "featureStock" },
  { key: "wholesalePrice", label: "featureWholesale" },
  { key: "warehouses", label: "featureWarehouses" },
];

// Read-only on purpose: packages/shared/src/plans.ts is the single source of
// truth for prices and features, so this page can never disagree with what
// the dashboard, API and storefront enforce.
export default function AdminPlansPage() {
  const t = useTranslations("Admin");
  const tNav = useTranslations("AdminNav");
  const tPlan = useTranslations("Plans");
  const tBilling = useTranslations("Billing");

  const included = (yes: boolean, label: string) =>
    yes ? (
      <Check className="h-4 w-4 text-success" aria-label={label} />
    ) : (
      <Minus className="h-4 w-4 text-muted" aria-label={t("notIncluded")} />
    );

  return (
    <>
      <PageHeader title={tNav("plans")} description={t("plansDescription")} />

      <section className="flex flex-col gap-3">
        <SectionTitle>{t("plansTitle")}</SectionTitle>
        <Card className="hidden overflow-x-auto p-0 lg:block">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">{t("colPlan")}</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">{t("colPriceUsd")}</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">{t("colPriceKhr")}</th>
                <th scope="col" className="px-4 py-2 font-medium">{t("colProductLimit")}</th>
                {FEATURES.map((feature) => (
                  <th key={feature.key} scope="col" className="px-4 py-2 text-center font-medium">
                    {tBilling(feature.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {PLAN_ORDER.map((plan) => {
                const definition = PLANS[plan];
                return (
                  <tr key={plan}>
                    <td className="px-4 py-3 font-semibold">
                      {tPlan(plan)}
                      {definition.trialDays !== null && (
                        <span className="ml-2 text-xs font-normal text-muted">
                          {tBilling("trialLength", { count: definition.trialDays })}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatUsd(definition.monthlyPrice.usdCents)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatKhr(definition.monthlyPrice.khr)}</td>
                    <td className="px-4 py-3">
                      {definition.maxProducts === null ? t("unlimited") : definition.maxProducts}
                    </td>
                    {FEATURES.map((feature) => (
                      <td key={feature.key} className="px-4 py-3">
                        <span className="flex justify-center">
                          {included(planHasFeature(plan, feature.key), tBilling(feature.label))}
                        </span>
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
          {PLAN_ORDER.map((plan) => {
            const definition = PLANS[plan];
            return (
              <Card key={plan} className="flex flex-col gap-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-semibold">{tPlan(plan)}</p>
                  <p className="text-right text-sm tabular-nums">
                    {formatUsd(definition.monthlyPrice.usdCents)} · {formatKhr(definition.monthlyPrice.khr)}
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-sm">
                  <li className="flex justify-between gap-2">
                    <span className="text-muted">{t("colProductLimit")}</span>
                    <span>{definition.maxProducts === null ? t("unlimited") : definition.maxProducts}</span>
                  </li>
                  {FEATURES.map((feature) => (
                    <li key={feature.key} className="flex items-center justify-between gap-2">
                      <span className="text-muted">{tBilling(feature.label)}</span>
                      {included(planHasFeature(plan, feature.key), tBilling(feature.label))}
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <SectionTitle>{t("billingRulesTitle")}</SectionTitle>
        <Card className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted">{t("ruleBillingPeriod")}</p>
            <p className="font-semibold">{t("daysValue", { count: BILLING_PERIOD_DAYS })}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t("ruleGracePeriod")}</p>
            <p className="font-semibold">{t("daysValue", { count: GRACE_PERIOD_DAYS })}</p>
          </div>
          <div>
            <p className="text-xs text-muted">{t("ruleInvoiceLead")}</p>
            <p className="font-semibold">{t("daysValue", { count: INVOICE_LEAD_DAYS })}</p>
          </div>
        </Card>
        <p className="text-xs text-muted">{t("plansSourceNote")}</p>
      </section>
    </>
  );
}
