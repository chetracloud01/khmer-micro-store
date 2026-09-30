"use client";

import { getInvoiceView } from "@khmer-micro-store/shared";
import { cn, SegmentedControl, ThemeSwitcher } from "@khmer-micro-store/ui";
import { ChevronRight, LogOut, Menu, PanelLeftClose, PanelLeftOpen, ShieldHalf, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAdmin } from "../admin-context";
import { useMerchantProducts } from "../merchant-products-context";
import { useMerchantProfile } from "../merchant-profile-context";
import { useMerchantSubscription } from "../merchant-subscription-context";
import { useThemeLabels } from "../use-theme-labels";
import { adminHref, findActiveNav, type AdminBadge } from "./admin-nav";
import { AdminNavMenu } from "./admin-nav-menu";
import { useAdminData } from "./use-admin-data";
import { useAdminInvoices } from "./use-admin-money";

const COLLAPSED_KEY = "khmer-micro-store:mockup-admin-sidebar-collapsed";

// Mock only: the real admin area sits behind admin login with 2FA
// (docs/blueprint.md Security). Every admin page renders inside this shell.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const ready = [useAdmin(), useMerchantSubscription(), useMerchantProfile(), useMerchantProducts()].every(
    (context) => context.hydrated,
  );
  return ready ? <AdminShell>{children}</AdminShell> : null;
}

function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations("AdminNav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { counts } = useAdminData();
  const themeLabels = useThemeLabels();
  const active = findActiveNav(pathname, locale);

  // The shell only ever renders in the browser (it waits for saved data), so
  // reading storage here is safe and avoids a wide-then-narrow flicker.
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  // Animate only when the user toggles, never on page load.
  const [animateWidth, setAnimateWidth] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen && !accountOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrawerOpen(false);
        setAccountOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen, accountOpen]);

  function toggleCollapsed() {
    setAnimateWidth(true);
    setCollapsed((prev) => {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, prev ? "0" : "1");
      } catch {
        // Storage unavailable — the choice just won't be remembered.
      }
      return !prev;
    });
  }

  function switchLocale(next: string) {
    router.push(`/${next}/${pathname.split("/").slice(2).join("/")}`);
  }

  const { rows: invoiceRows } = useAdminInvoices();
  const { failedChecks } = useAdmin();
  const badgeCount: Record<AdminBadge, number> = {
    kycPending: counts.kycPending,
    invoicesOverdue: invoiceRows.filter((invoice) => getInvoiceView(invoice) === "overdue").length,
    failedChecks: failedChecks.filter((check) => check.status === "open").length,
  };

  const navList = (compact: boolean) => (
    <AdminNavMenu
      compact={compact}
      locale={locale}
      activeKey={active?.item.key}
      activeGroupKey={active?.group.key}
      badgeCount={badgeCount}
    />
  );

  const brand = (compact: boolean) => (
    <Link href={adminHref(locale, "")} className="flex min-h-touch items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-DEFAULT bg-brand text-on-brand">
        <ShieldHalf className="h-5 w-5" aria-hidden="true" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-nav-fg">{t("brand")}</span>
          <span className="block text-xs text-nav-muted">{t("area")}</span>
        </span>
      )}
    </Link>
  );

  return (
    <div className="flex min-h-screen bg-canvas text-fg">
      {/* Laptop and up: a fixed dark sidebar that can shrink to icons. */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col gap-4 border-r border-nav-border bg-nav-bg p-3 lg:flex",
          animateWidth && "transition-[width] duration-300 ease-out motion-reduce:transition-none",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        <div className={cn(collapsed && "flex justify-center")}>{brand(collapsed)}</div>
        {/* Only the menu scrolls; the logo and the collapse button stay put. */}
        <div className="nav-scroll -mx-3 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3">{navList(collapsed)}</div>
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? t("expandMenu") : t("collapseMenu")}
          className={cn(
            "flex min-h-touch items-center gap-3 rounded-DEFAULT px-3 text-sm text-nav-muted hover:bg-nav-fg/5 hover:text-nav-fg",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-5 w-5" aria-hidden="true" />
          ) : (
            <>
              <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
              {t("collapseMenu")}
            </>
          )}
        </button>
      </aside>

      {/* Phones and tablets: the same menu in a drawer. */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 animate-fade-in bg-fg/40 motion-reduce:animate-none"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("menuLabel")}
            className="nav-scroll relative flex h-full w-72 max-w-[85vw] animate-drawer-in flex-col gap-4 overflow-y-auto bg-nav-bg p-3 shadow-xl motion-reduce:animate-none"
          >
            <div className="flex items-center justify-between gap-2">
              {brand(false)}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={t("closeMenu")}
                className="flex h-11 w-11 items-center justify-center rounded-DEFAULT text-nav-muted hover:bg-nav-fg/5 hover:text-nav-fg"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {navList(false)}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-1 border-b border-border bg-bg/85 px-2 py-2 backdrop-blur md:gap-2 md:px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("openMenu")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-DEFAULT text-muted hover:bg-border/20 lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <nav aria-label={t("breadcrumbLabel")} className="flex min-w-0 flex-1 items-center gap-1 text-sm">
            {active && (
              <>
                <span className="hidden truncate text-muted sm:inline">{t(active.group.key)}</span>
                <ChevronRight className="hidden h-4 w-4 shrink-0 text-muted sm:inline" aria-hidden="true" />
                <span className="truncate font-medium text-fg">{t(active.item.key)}</span>
              </>
            )}
            <span
              title={t("mockNote")}
              className="ml-2 hidden shrink-0 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning sm:inline"
            >
              {t("mockBadge")}
            </span>
          </nav>

          <SegmentedControl
            value={locale}
            onChange={switchLocale}
            className="shrink-0"
            options={[
              { value: "km", label: "ខ្មែរ" },
              { value: "en", label: "EN" },
            ]}
          />

          <ThemeSwitcher labels={themeLabels} className="shrink-0" />

          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-label={t("accountMenu")}
              aria-expanded={accountOpen}
              className="flex h-11 w-11 items-center justify-center rounded-full"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-fg text-xs font-semibold text-bg">SA</span>
            </button>
            {accountOpen && (
              <>
                <div aria-hidden="true" onClick={() => setAccountOpen(false)} className="fixed inset-0 z-10" />
                <div className="absolute right-0 top-12 z-20 w-60 rounded-DEFAULT border border-border bg-bg p-2 shadow-raised">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold">{t("accountName")}</p>
                    <p className="text-xs text-muted">{t("accountRole")}</p>
                  </div>
                  <div className="my-1 h-px bg-border" />
                  <button
                    type="button"
                    disabled
                    title={t("mockNote")}
                    className="flex min-h-touch w-full items-center gap-2 rounded-DEFAULT px-3 text-sm text-muted disabled:cursor-not-allowed"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {t("signOut")}
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Keyed on the URL so each page fades in when you move between them. */}
        <main
          key={pathname}
          className="mx-auto flex w-full max-w-[1200px] flex-1 animate-page-in flex-col gap-6 p-4 motion-reduce:animate-none md:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
