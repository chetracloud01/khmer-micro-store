"use client";

import { SegmentedControl } from "@khmer-micro-store/ui";
import { LayoutDashboard, Package, Store } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
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

function DashboardFrame({ store, children }: { store: StoreDetails; children: ReactNode }) {
  const t = useTranslations("App");
  const tDash = useTranslations("Dashboard");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const base = `/${locale}/m`;
  const tabs = [
    { href: base, label: tDash("navHome"), icon: LayoutDashboard },
    { href: `${base}/products`, label: tDash("navProducts"), icon: Package },
    { href: `${base}/settings`, label: t("navShop"), icon: Store },
  ];
  const isActive = (href: string) => (href === base ? pathname === href : pathname.startsWith(href));

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col bg-bg md:border-x md:border-border">
        <header className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex min-w-0 items-center gap-3">
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- the shop's own uploaded logo
              <img src={store.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-base font-bold text-on-brand">
                {store.name.charAt(0).toUpperCase()}
              </span>
            )}
            <p className="truncate font-semibold">{store.name}</p>
          </div>
          <SegmentedControl
            value={locale}
            onChange={(next) => router.replace(pathname.replace(/^\/(km|en)/, `/${next}`))}
            options={[
              { value: "km", label: "ខ្មែរ" },
              { value: "en", label: "EN" },
            ]}
          />
        </header>

        {store.paused && <p className="bg-danger/10 px-4 py-2 text-sm font-medium text-danger">{tDash("bannerPaused")}</p>}

        <main className="flex min-w-0 flex-1 flex-col pb-[calc(5rem+env(safe-area-inset-bottom))]">{children}</main>
      </div>

      {/* 64px of tabs plus the phone's home-bar gap; .bottom-above-nav (globals.css) keeps form bars on top of it. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex h-16 max-w-[640px]">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive(tab.href) ? "page" : undefined}
              className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
                isActive(tab.href) ? "text-brand" : "text-muted"
              }`}
            >
              <tab.icon className="h-5 w-5" aria-hidden="true" />
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
