"use client";

import { Button, Card, cn } from "@khmer-micro-store/ui";
import {
  BadgeCheck,
  Bell,
  Check,
  ChevronRight,
  ImagePlus,
  PackagePlus,
  Share2,
  ShoppingBag,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";
import { useAdmin } from "../admin-context";
import { useDeliverySettings } from "../delivery-settings-context";
import { useMerchantAccount } from "../merchant-account-context";
import { useMerchantProducts } from "../merchant-products-context";
import { useMerchantProfile } from "../merchant-profile-context";
import { useOrders } from "../orders-context";
import { shareOrCopyLink } from "../share-link";
import { useStorePayments } from "../store-settings-context";

interface SetupItem {
  key: string;
  icon: LucideIcon;
  title: string;
  hint?: string;
  /** Where the step is done. The last step (share) is done right here instead. */
  href?: string;
  done: boolean;
}

/**
 * What a new shop still needs after the 2-step onboarding, in the order of
 * docs/App Workflows "Seller onboarding": products → payment → delivery →
 * Telegram → a test order → share the link. Logo and verification help but
 * never hold the shop back, so they sit underneath as extras.
 * Hidden once the six steps are done.
 */
export function SetupChecklist() {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const profile = useMerchantProfile();
  const { products } = useMerchantProducts();
  const { telegramLogin } = useMerchantAccount();
  const { demoKycStatus } = useAdmin();
  const { khqrReady } = useStorePayments();
  const { configured: deliveryConfigured } = useDeliverySettings();
  const { orders } = useOrders();
  const [shareNote, setShareNote] = useState<"idle" | "manual">("idle");

  if (!profile.hasProfile) return null;

  const base = `/${locale}/mockup/dashboard`;
  const steps: SetupItem[] = [
    { key: "products", icon: PackagePlus, title: t("setupProducts"), href: `${base}/products/new`, done: products.length > 0 },
    { key: "bakong", icon: Wallet, title: t("setupBakong"), hint: t("setupBakongHint"), href: `${base}/profile#payments`, done: khqrReady },
    { key: "delivery", icon: Truck, title: t("setupDelivery"), hint: t("setupDeliveryHint"), href: `${base}/delivery`, done: deliveryConfigured },
    {
      key: "alerts",
      icon: Bell,
      title: t("setupAlerts"),
      href: `${base}/profile#alerts`,
      done: !!telegramLogin || profile.telegramConnected,
    },
    {
      key: "testOrder",
      icon: ShoppingBag,
      title: t("setupTestOrder"),
      hint: t("setupTestOrderHint"),
      href: `/${locale}/mockup/storefront`,
      done: orders.some((order) => order.fromShop),
    },
    { key: "share", icon: Share2, title: t("setupShare"), hint: t("setupShareHint"), done: profile.linkShared },
  ];
  const extras: SetupItem[] = [
    { key: "logo", icon: ImagePlus, title: t("setupLogo"), href: `${base}/profile`, done: !!profile.logoDataUrl },
    {
      key: "verify",
      icon: BadgeCheck,
      title: t("setupVerify"),
      href: `${base}/verification`,
      // Sent counts: the rest is the admin's turn.
      done: demoKycStatus === "pending" || demoKycStatus === "approved",
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;
  const nextKey = steps.find((step) => !step.done)?.key;
  const shopUrl = () => `${window.location.origin}/s/${profile.slug}`;

  async function handleShare() {
    const outcome = await shareOrCopyLink(profile.shopName, shopUrl());
    if (outcome === "shared" || outcome === "copied") profile.setLinkShared(true);
    if (outcome === "manual") setShareNote("manual");
  }

  function row(item: SetupItem, position: number | null) {
    const isNext = item.key === nextKey;
    const content = (
      <>
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            item.done ? "bg-success/10 text-success" : isNext ? "bg-brand text-on-brand" : "bg-border/30 text-muted",
          )}
        >
          {item.done ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : position !== null ? (
            position
          ) : (
            <item.icon className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm font-medium", item.done && "text-muted line-through")}>{item.title}</span>
          {item.hint && !item.done && <span className="block text-sm text-muted">{item.hint}</span>}
        </span>
        {!item.done && <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />}
      </>
    );
    const className = cn(
      "flex min-h-touch w-full items-center gap-3 rounded-DEFAULT px-2 py-2 text-left",
      item.done ? "pointer-events-none" : "hover:bg-border/10",
      isNext && "border border-brand/40 bg-brand/5",
    );
    return (
      <li key={item.key}>
        {item.href ? (
          <Link href={item.href} aria-disabled={item.done} className={className}>
            {content}
          </Link>
        ) : (
          <button type="button" onClick={handleShare} disabled={item.done} className={className}>
            {content}
          </button>
        )}
      </li>
    );
  }

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{t("setupTitle")}</h2>
        <span className="shrink-0 text-sm text-muted">{t("setupProgress", { done: doneCount, total: steps.length })}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border/40" aria-hidden="true">
        <div
          className="h-full rounded-full bg-brand transition-all motion-reduce:transition-none"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>
      <ol className="flex flex-col gap-1">{steps.map((step, index) => row(step, index + 1))}</ol>

      {shareNote === "manual" && !profile.linkShared && (
        <div className="flex flex-col gap-2 rounded-DEFAULT border border-border p-3">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-muted">{t("setupShareManual")}</span>
            <input
              readOnly
              value={shopUrl()}
              onFocus={(event) => event.currentTarget.select()}
              className="min-h-touch w-full rounded-DEFAULT border border-border bg-bg px-3 text-base text-fg"
            />
          </label>
          <Button variant="secondary" className="self-start" onClick={() => profile.setLinkShared(true)}>
            {t("setupShareDone")}
          </Button>
        </div>
      )}

      {extras.some((item) => !item.done) && (
        <div className="flex flex-col gap-1 border-t border-border pt-3">
          <h3 className="px-2 text-sm font-medium text-muted">{t("setupExtras")}</h3>
          <ul className="flex flex-col gap-1">{extras.map((item) => row(item, null))}</ul>
        </div>
      )}
    </Card>
  );
}
