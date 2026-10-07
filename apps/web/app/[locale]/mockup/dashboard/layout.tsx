"use client";

import { planHasFeature } from "@khmio/shared";
import { Badge, SegmentedControl, ThemeSwitcher } from "@khmio/ui";
import {
  CreditCard,
  LayoutDashboard,
  Lock,
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
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { mockStore } from "@/mock/mock-data";
import { useAdmin } from "../admin-context";
import { AppSwitcher } from "../app-switcher";
import { useMerchantProfile } from "../merchant-profile-context";
import { useMerchantSubscription } from "../merchant-subscription-context";
import { useStorePayments, useStoreSettings } from "../store-settings-context";
import { useThemeLabels } from "@/components/use-theme-labels";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("Dashboard");
  const themeLabels = useThemeLabels();
  const locale = useLocale();
  const router = useRouter();
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

  function isActive(href: string) {
    return href === homeHref ? pathname === href : pathname.startsWith(href);
  }

  function isActiveOnMobile(href: string) {
    return isActive(href) || (href === profileHref && reachedFromProfile.some((other) => pathname.startsWith(other)));
  }

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

  // Keeps whatever dashboard sub-page you're on when switching locale,
  // instead of always jumping back to the dashboard home.
  function switchLocale(next: string) {
    const rest = pathname.split("/").slice(2).join("/");
    router.push(`/${next}/${rest}`);
  }

  const languageToggle = (direction: "up" | "down") => (
    <div className="flex shrink-0 items-center gap-1">
      <SegmentedControl
        value={locale}
        onChange={switchLocale}
        options={[
          { value: "km", label: "ខ្មែរ" },
          { value: "en", label: "EN" },
        ]}
      />
      <ThemeSwitcher labels={themeLabels} direction={direction} />
    </div>
  );

  const shopIdentity = (
    <div className="flex min-w-0 items-center gap-3">
      {logoDataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- local FileReader preview, not a remote image
        <img src={logoDataUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-on-brand">
          {shopName.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 max-w-[55vw] md:max-w-[160px]">
        <p className="truncate text-sm font-semibold text-fg">{shopName}</p>
        {demoKycStatus === "approved" ? (
          <Badge className="truncate">{t("verified")}</Badge>
        ) : (
          <Link href={verificationHref} className="-my-2 flex min-h-touch items-center truncate text-sm font-medium text-warning underline-offset-2 hover:underline">
            {demoKycStatus === "pending" ? t("verificationPending") : t("verifyShop")}
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-canvas md:flex-row">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-border bg-bg p-4 md:flex">
        <div className="flex items-center justify-between gap-2">
          {shopIdentity}
          <AppSwitcher current="shop" />
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`flex min-h-touch items-center gap-3 rounded-DEFAULT px-3 text-sm font-medium transition-colors ${
                isActive(item.href) ? "bg-brand/10 text-brand" : "text-muted hover:bg-border/10 hover:text-fg"
              }`}
            >
              <item.icon className="h-5 w-5" aria-hidden="true" />
              {item.label}
              {item.href === stockHref && stockLocked && (
                <Lock className="ml-auto h-4 w-4 text-muted" aria-label={t("lockedOnPlan")} />
              )}
            </Link>
          ))}
        </nav>

        {languageToggle("up")}
      </aside>

      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-bg p-4 md:hidden">
        {shopIdentity}
        <div className="flex items-center gap-1">
          {languageToggle("down")}
          <AppSwitcher current="shop" align="right" />
        </div>
      </header>

      <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-4">
        {banner && (
          <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm font-medium ${banner.tone}`}>
            <span>{banner.text}</span>
            <Link href={banner.href} className="flex min-h-touch items-center underline underline-offset-2">
              {banner.action}
            </Link>
          </div>
        )}
        {children}
      </main>

      {/* 64px of tabs plus the phone's home-bar gap, so sticky form bars can sit
          right on top of it with .bottom-above-nav (globals.css). */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex h-[calc(4rem+env(safe-area-inset-bottom))] border-t border-border bg-bg pb-[env(safe-area-inset-bottom)] md:hidden">
        {navItems.filter((item) => item.mobile).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActiveOnMobile(item.href) ? "page" : undefined}
            className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
              isActiveOnMobile(item.href) ? "text-brand" : "text-muted"
            }`}
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
