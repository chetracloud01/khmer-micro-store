"use client";

import { LayoutDashboard, Package, Settings, ShoppingBag, Store, Truck } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SellerFrame } from "@/components/seller-frame/seller-frame";
import { api, getMe, type Me, type StoreDetails } from "@/lib/api";
import { AppLoading, AppOffline } from "../app-frame";
import { MerchantContext } from "./merchant-context";

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

  if (state === "offline") return <AppOffline onRetry={load} />;
  if (state === "checking" || !data) return <AppLoading />;
  return (
    <MerchantContext.Provider value={{ ...data, refreshStore }}>
      <DashboardFrame store={data.store}>{children}</DashboardFrame>
    </MerchantContext.Provider>
  );
}

/** The shared seller frame (components/seller-frame), with the live dashboard's sections. */
function DashboardFrame({ store, children }: { store: StoreDetails; children: ReactNode }) {
  const t = useTranslations("App");
  const tDash = useTranslations("Dashboard");
  const locale = useLocale();
  const base = `/${locale}/m`;
  return (
    <SellerFrame
      shop={{ name: store.name, logoUrl: store.logoUrl }}
      homeHref={base}
      nav={[
        { href: base, label: tDash("navHome"), icon: LayoutDashboard, mobile: true },
        { href: `${base}/products`, label: tDash("navProducts"), icon: Package, mobile: true },
        { href: `${base}/orders`, label: tDash("navOrders"), icon: ShoppingBag, mobile: true },
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
