"use client";

import { cn, SegmentedControl } from "@khmer-micro-store/ui";
import { Layers, LayoutDashboard, LogOut, Menu, ScrollText, Settings, ShieldHalf, Store, X, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { AdminMe } from "@/lib/admin-api";
import { api, ApiError } from "@/lib/api";
import { AdminContext, type ActiveAdmin } from "./admin-context";
import { AdminLogin } from "./admin-login";

// The real admin area (roadmap step 7), laptop-first and usable on a phone.
// Nothing renders until the API says both login steps are done; the API
// checks the admin's role again on every request.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const t = useTranslations("App");
  const [me, setMe] = useState<AdminMe | null>(null);
  const [state, setState] = useState<"checking" | "ready" | "offline">("checking");

  const load = useCallback(() => {
    setState("checking");
    api<AdminMe>("/admin/auth/me")
      .then((result) => {
        setMe(result);
        setState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof ApiError && error.status === 401) {
          setMe(null);
          setState("ready");
        } else setState("offline");
      });
  }, []);
  useEffect(load, [load]);

  if (state === "checking") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas text-muted" aria-busy="true">
        <span role="status">{t("loading")}</span>
      </div>
    );
  }
  if (state === "offline") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-canvas p-4 text-center" role="alert">
        <p className="font-semibold">{t("offlineTitle")}</p>
        <button type="button" onClick={load} className="min-h-touch rounded-DEFAULT bg-brand px-4 text-on-brand">
          {t("retry")}
        </button>
      </div>
    );
  }
  if (!me || me.stage !== "active") return <AdminLogin me={me} onSignedIn={load} />;
  return (
    <AdminContext.Provider value={me}>
      <AdminShell me={me}>{children}</AdminShell>
    </AdminContext.Provider>
  );
}

function AdminShell({ me, children }: { me: ActiveAdmin; children: ReactNode }) {
  const t = useTranslations("AdminNav");
  const tApp = useTranslations("AdminApp");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const base = `/${locale}/admin`;
  const items: { href: string; label: string; icon: LucideIcon }[] = [
    { href: base, label: t("overview"), icon: LayoutDashboard },
    { href: `${base}/merchants`, label: t("merchants"), icon: Store },
    { href: `${base}/plans`, label: t("plans"), icon: Layers },
    { href: `${base}/audit-log`, label: t("auditLog"), icon: ScrollText },
    { href: `${base}/settings`, label: t("settings"), icon: Settings },
  ];
  const isActive = (href: string) => (href === base ? pathname === href : pathname.startsWith(href));
  useEffect(() => setDrawerOpen(false), [pathname]);

  async function signOut() {
    await api("/admin/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.reload();
  }

  const nav = (
    <nav aria-label={t("menuLabel")} className="flex flex-1 flex-col gap-1">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(item.href) ? "page" : undefined}
          className={cn(
            "flex min-h-touch items-center gap-3 rounded-DEFAULT px-3 text-sm font-medium",
            isActive(item.href) ? "bg-brand/10 text-brand" : "text-muted hover:bg-border/10 hover:text-fg",
          )}
        >
          <item.icon className="h-5 w-5" aria-hidden="true" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
  const account = (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <div className="min-w-0 px-1">
        <p className="truncate text-sm font-semibold">{me.name}</p>
        <p className="text-xs text-muted">{tApp(`role_${me.role}`)}</p>
      </div>
      <SegmentedControl
        value={locale}
        onChange={(next) => router.replace(pathname.replace(/^\/(km|en)/, `/${next}`))}
        options={[
          { value: "km", label: "ខ្មែរ" },
          { value: "en", label: "EN" },
        ]}
      />
      <button type="button" onClick={() => void signOut()} className="flex min-h-touch items-center gap-2 rounded-DEFAULT px-3 text-sm text-muted hover:bg-border/10 hover:text-fg">
        <LogOut className="h-4 w-4" aria-hidden="true" />
        {t("signOut")}
      </button>
    </div>
  );
  const brand = (
    <span className="flex items-center gap-2 font-semibold">
      <ShieldHalf className="h-6 w-6 text-brand" aria-hidden="true" />
      {tApp("title")}
    </span>
  );

  return (
    <div className="flex min-h-dvh bg-canvas text-fg">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-border bg-bg p-4 lg:flex">
        {brand}
        {nav}
        {account}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-bg p-3 lg:hidden">
          {brand}
          <button type="button" onClick={() => setDrawerOpen(true)} aria-label={t("openMenu")} className="flex h-11 w-11 items-center justify-center rounded-DEFAULT hover:bg-border/20">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>
        <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 md:p-6">{children}</main>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-fg/40" />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 bg-bg p-4" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between">
              {brand}
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label={t("closeMenu")} className="flex h-11 w-11 items-center justify-center rounded-DEFAULT hover:bg-border/20">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {nav}
            {account}
          </div>
        </div>
      )}
    </div>
  );
}
