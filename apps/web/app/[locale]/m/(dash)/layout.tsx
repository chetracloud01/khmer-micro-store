"use client";

import { ExternalLink, LayoutDashboard, Package, Settings, ShoppingBag, Store, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SellerFrame } from "@/components/seller-frame/seller-frame";
import { api, getMe, type Me, type SellerSummary, type StoreDetails } from "@/lib/api";
import { AppLoading, AppOffline } from "../app-frame";
import { MerchantContext, shopStateOf } from "./merchant-context";

// The real dashboard (roadmap step 3): every signed-in page sits in this
// frame. It reads who is signed in and their shop once, sends anyone without
// a session to login and anyone without a shop to onboarding, and gives the
// pages the shop through useMerchant().
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const [data, setData] = useState<{ me: Me; store: StoreDetails } | null>(null);
  const [state, setState] = useState<"checking" | "ready" | "offline">("checking");

  const load = useCallback(() => {
    setState("checking");
    getMe()
      .then(async (me) => {
        if (!me) return router.replace(`/${locale}/m/login`);
        if (!me.store) return router.replace(`/${locale}/m/onboarding`);
        setData({ me, store: await api<StoreDetails>("/store") });
        setState("ready");
      })
      .catch(() => setState("offline"));
  }, [locale, router]);
  useEffect(load, [load]);

  const refreshStore = useCallback(async () => {
    const store = await api<StoreDetails>("/store");
    setData((previous) => (previous ? { ...previous, store } : previous));
  }, []);

  // The home page's numbers and the Orders badge: once ready, then every minute (a missed refresh keeps the last numbers).
  const [summary, setSummary] = useState<SellerSummary | null>(null);
  const refreshSummary = useCallback(async () => {
    await api<SellerSummary>("/orders/summary").then(setSummary, () => undefined);
  }, []);
  useEffect(() => {
    if (state !== "ready") return;
    void refreshSummary();
    const timer = window.setInterval(() => void refreshSummary(), 60_000);
    return () => window.clearInterval(timer);
  }, [state, refreshSummary]);

  if (state === "offline") return <AppOffline onRetry={load} />;
  if (state === "checking" || !data) return <AppLoading />;
  return (
    <MerchantContext.Provider value={{ ...data, refreshStore, summary, refreshSummary }}>
      <DashboardFrame me={data.me} store={data.store} waiting={summary?.waiting ?? 0}>
        {children}
      </DashboardFrame>
    </MerchantContext.Provider>
  );
}

/**
 * The shared seller frame (components/seller-frame) in its Deep Khmio Teal
 * look, with the live dashboard's sections: the Orders count, the plan in a
 * box at the bottom of the sidebar, and "View my shop" in the laptop's top bar.
 */
function DashboardFrame({ me, store, waiting, children }: { me: Me; store: StoreDetails; waiting: number; children: ReactNode }) {
  const t = useTranslations("App");
  const tDash = useTranslations("Dashboard");
  const tPlans = useTranslations("Plans");
  const locale = useLocale();
  const base = `/${locale}/m`;
  const shopPath = `/s/${store.slug}`;
  const state = shopStateOf(me, store);
  const stateLabel =
    state.kind === "paused" ? tDash("statusPaused") : state.kind === "due" ? tDash("statusDue") : state.kind === "trial" ? tDash("statusTrial", { count: state.daysLeft }) : tDash("statusOpen");
  return (
    <SellerFrame
      look="teal"
      shop={{
        name: store.name,
        logoUrl: store.logoUrl,
        belowOnTeal: <span className="block truncate text-xs text-nav-muted">{shopPath}</span>,
      }}
      homeHref={base}
      sidebarFooter={
        <div className="flex flex-col gap-0.5 rounded-DEFAULT border border-nav-border p-3">
          <span className="text-sm font-semibold text-nav-fg">{tDash("planLine", { plan: tPlans(store.plan) })}</span>
          <span className="text-xs text-nav-muted">{stateLabel}</span>
        </div>
      }
      topBarExtra={
        <Link href={`/${locale}${shopPath}`} target="_blank" className="flex min-h-touch items-center gap-2 rounded-DEFAULT px-3 text-sm font-medium text-brand hover:bg-brand/5">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {tDash("actionViewShop")}
        </Link>
      }
      nav={[
        { href: base, label: tDash("navHome"), icon: LayoutDashboard, mobile: true },
        { href: `${base}/products`, label: tDash("navProducts"), icon: Package, mobile: true },
        { href: `${base}/orders`, label: tDash("navOrders"), icon: ShoppingBag, mobile: true, badge: waiting },
        // Delivery and store settings are reached from "My shop" on a phone, so that tab stays lit there.
        { href: `${base}/settings`, label: t("navShop"), icon: Store, mobile: true, alsoActiveOn: [`${base}/delivery`, `${base}/store-settings`] },
        { href: `${base}/delivery`, label: tDash("navDelivery"), icon: Truck, mobile: false },
        { href: `${base}/store-settings`, label: tDash("navSettings"), icon: Settings, mobile: false },
      ]}
      banner={store.paused && <p className="bg-danger/10 px-4 py-2 text-sm font-medium text-danger">{tDash("bannerPaused")}</p>}
    >
      {children}
    </SellerFrame>
  );
}
