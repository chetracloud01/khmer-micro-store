"use client";

import { planHasFeature } from "@khmio/shared";
import { Badge } from "@khmio/ui";
import {
  CreditCard,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Truck,
  Warehouse,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SellerFrame } from "@/components/seller-frame/seller-frame";
import { mockStore } from "@/mock/mock-data";
import { useAdmin } from "../admin-context";
import { AppSwitcher } from "../app-switcher";
import { useMerchantProfile } from "../merchant-profile-context";
import { useMerchantSubscription } from "../merchant-subscription-context";
import { useStorePayments, useStoreSettings } from "../store-settings-context";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const pathname = usePathname();
  const profile = useMerchantProfile();

  const shopName = profile.hasProfile ? profile.shopName : locale === "km" ? mockStore.nameKm : mockStore.nameEn;
  const logoDataUrl = profile.hasProfile ? profile.logoDataUrl : null;

  const billingHref = `/${locale}/mockup/dashboard/billing`;
  const profileHref = `/${locale}/mockup/dashboard/profile`;
  const settingsHref = `/${locale}/mockup/dashboard/settings`;
  const verificationHref = `/${locale}/mockup/dashboard/verification`;
  const deliveryHref = `/${locale}/mockup/dashboard/delivery`;
  const { demoKycStatus } = useAdmin();

  // Delivery, Store settings, Verification and Billing are sidebar-only: five tabs is
  // the most a 360px bottom bar holds. On phones they're reached from the
  // Profile page, and the Profile tab stays highlighted while you're there.
  const navItems = [
    { href: `/${locale}/mockup/dashboard`, label: t("navHome"), icon: LayoutDashboard, mobile: true },
    { href: `/${locale}/mockup/dashboard/products`, label: t("navProducts"), icon: Package, mobile: true },
    { href: `/${locale}/mockup/dashboard/stock`, label: t("navStock"), icon: Warehouse, mobile: true },
    { href: `/${locale}/mockup/dashboard/orders`, label: t("navOrders"), icon: ShoppingBag, mobile: true },
    { href: profileHref, label: t("navProfile"), icon: Store, mobile: true },
    { href: deliveryHref, label: t("navDelivery"), icon: Truck, mobile: false },
    { href: settingsHref, label: t("navSettings"), icon: Settings, mobile: false },
    { href: verificationHref, label: t("navVerification"), icon: ShieldCheck, mobile: false },
    { href: billingHref, label: t("navBilling"), icon: CreditCard, mobile: false },
  ];

  const homeHref = `/${locale}/mockup/dashboard`;
  const reachedFromProfile = [billingHref, settingsHref, verificationHref, deliveryHref];

  const { hydrated: subscriptionReady, subscription } = useMerchantSubscription();
  const stockHref = `/${locale}/mockup/dashboard/stock`;
  const stockLocked = subscriptionReady && !planHasFeature(subscription.plan, "stock");
  const { khqrReady } = useStorePayments();
  const { settings: storeSettings } = useStoreSettings();
  const planBanner =
    subscriptionReady && !pathname.startsWith(billingHref)
      ? subscription.status === "trialing"
        ? { text: t("bannerTrial", { count: subscription.daysLeft }), action: t("bannerChoosePlan"), tone: "bg-brand/10 text-brand", href: billingHref, urgent: false }
        : subscription.status === "grace"
          ? { text: t("bannerGrace", { count: subscription.daysLeft }), action: t("bannerPayNow"), tone: "bg-warning/10 text-warning", href: billingHref, urgent: true }
          : subscription.status === "paused"
            ? { text: t("bannerPaused"), action: t("bannerReopen"), tone: "bg-danger/10 text-danger", href: billingHref, urgent: true }
            : null
      : null;
  // An overdue or paused plan matters most; next, a missing Bakong ID (buyers
  // can't pay); the trial reminder comes last.
  // A Bakong ID isn't required: with cash on delivery on, buyers can already pay.
  const paymentBanner =
    profile.hasProfile && !khqrReady && !storeSettings.allowCod && !pathname.startsWith(profileHref)
      ? { text: t("bannerNoPayment"), action: t("bannerAddBakong"), tone: "bg-warning/10 text-warning", href: `${profileHref}#payments`, urgent: true }
      : null;
  const banner = planBanner?.urgent ? planBanner : (paymentBanner ?? planBanner);

  return (
    <SellerFrame
      shop={{
        name: shopName,
        logoUrl: logoDataUrl,
        below:
          demoKycStatus === "approved" ? (
            <Badge className="truncate">{t("verified")}</Badge>
          ) : (
            <Link href={verificationHref} className="-my-2 flex min-h-touch items-center truncate text-sm font-medium text-warning underline-offset-2 hover:underline">
              {demoKycStatus === "pending" ? t("verificationPending") : t("verifyShop")}
            </Link>
          ),
      }}
      homeHref={homeHref}
      nav={navItems.map((item) => ({
        ...item,
        // Delivery, Store settings, Verification and Billing are reached from the Profile tab on a phone.
        alsoActiveOn: item.href === profileHref ? reachedFromProfile : undefined,
        locked: item.href === stockHref && stockLocked,
        lockedLabel: t("lockedOnPlan"),
      }))}
      sidebarExtra={<AppSwitcher current="shop" />}
      headerExtra={<AppSwitcher current="shop" align="right" />}
      banner={
        banner && (
          <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm font-medium ${banner.tone}`}>
            <span>{banner.text}</span>
            <Link href={banner.href} className="flex min-h-touch items-center underline underline-offset-2">
              {banner.action}
            </Link>
          </div>
        )
      }
    >
      {children}
    </SellerFrame>
  );
}
