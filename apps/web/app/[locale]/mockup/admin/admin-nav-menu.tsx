"use client";

import { cn } from "@khmer-micro-store/ui";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { ADMIN_NAV, adminHref, type AdminBadge } from "./admin-nav";

const CLOSED_GROUPS_KEY = "khmer-micro-store:mockup-admin-nav-closed";

interface Indicator {
  top: number;
  height: number;
  visible: boolean;
}

function readClosedGroups(): Set<string> {
  try {
    const raw = window.localStorage.getItem(CLOSED_GROUPS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((key): key is string => typeof key === "string") : []);
  } catch {
    return new Set();
  }
}

/**
 * The admin menu: groups fold open and closed, one highlight slides to the
 * current page, and the current page is scrolled into view. `compact` is the
 * icon-only sidebar, where every item stays visible.
 */
export function AdminNavMenu({
  compact,
  locale,
  activeKey,
  activeGroupKey,
  badgeCount,
}: {
  compact: boolean;
  locale: string;
  activeKey: string | undefined;
  activeGroupKey: string | undefined;
  badgeCount: Record<AdminBadge, number>;
}) {
  const t = useTranslations("AdminNav");
  const idPrefix = useId();
  const navRef = useRef<HTMLElement>(null);
  const activeRef = useRef<HTMLAnchorElement>(null);
  // Only rendered in the browser (the shell waits for saved data).
  const [closedGroups, setClosedGroups] = useState(readClosedGroups);
  const [indicator, setIndicator] = useState<Indicator>({ top: 0, height: 0, visible: false });
  // Slide only after the first measurement, so the highlight doesn't fly in on load.
  const [animate, setAnimate] = useState(false);

  // Landing on a page opens the group it lives in.
  useEffect(() => {
    if (!activeGroupKey) return;
    setClosedGroups((prev) => {
      if (!prev.has(activeGroupKey)) return prev;
      const next = new Set(prev);
      next.delete(activeGroupKey);
      return next;
    });
  }, [activeGroupKey]);

  function toggleGroup(key: string) {
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      try {
        window.localStorage.setItem(CLOSED_GROUPS_KEY, JSON.stringify([...next]));
      } catch {
        // Storage unavailable — the choice just won't be remembered.
      }
      return next;
    });
  }

  const measure = useCallback(() => {
    const nav = navRef.current;
    const link = activeRef.current;
    if (!nav || !link) {
      setIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      return;
    }
    const navBox = nav.getBoundingClientRect();
    const linkBox = link.getBoundingClientRect();
    const folded = link.closest("[data-folded]") !== null;
    setIndicator({ top: linkBox.top - navBox.top, height: linkBox.height, visible: !folded });
  }, []);

  useLayoutEffect(() => {
    measure();
  }, [measure, activeKey, compact, closedGroups]);

  // Groups folding and the sidebar changing width move the items; follow them.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    const frame = window.requestAnimationFrame(() => setAnimate(true));
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [measure]);

  // Keep the current page in view in a long menu.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeKey]);

  return (
    <nav ref={navRef} aria-label={t("menuLabel")} className="relative flex flex-col gap-3">
      <span
        aria-hidden="true"
        style={{ transform: `translateY(${indicator.top}px)`, height: indicator.height }}
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 rounded-DEFAULT bg-nav-fg/10",
          "before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-brand",
          animate && "transition-[transform,height,opacity] duration-300 ease-out motion-reduce:transition-none",
          indicator.visible ? "opacity-100" : "opacity-0",
        )}
      />

      {ADMIN_NAV.map((group) => {
        // A one-item group (the overview) has nothing to fold.
        const foldable = !compact && group.items.length > 1;
        const open = !foldable || !closedGroups.has(group.key);
        const panelId = `${idPrefix}-${group.key}`;
        const holdsActive = group.key === activeGroupKey;

        return (
          <div key={group.key} className="flex flex-col">
            {compact ? (
              <div className="mx-auto mb-2 h-px w-6 bg-nav-border" aria-hidden="true" />
            ) : foldable ? (
              <button
                type="button"
                onClick={() => toggleGroup(group.key)}
                aria-expanded={open}
                aria-controls={panelId}
                className="group flex min-h-touch items-center gap-2 rounded-DEFAULT px-3 text-[11px] font-semibold uppercase tracking-wider text-nav-muted/80 transition-colors hover:text-nav-fg"
              >
                <span className="flex-1 text-left">{t(group.key)}</span>
                {holdsActive && !open && <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200 motion-reduce:transition-none",
                    !open && "-rotate-90",
                  )}
                  aria-hidden="true"
                />
              </button>
            ) : (
              <p className="flex min-h-9 items-center px-3 text-[11px] font-semibold uppercase tracking-wider text-nav-muted/80">
                {t(group.key)}
              </p>
            )}

            {/* Grid rows 0fr ↔ 1fr animates to the content's real height.
                `invisible` takes folded items out of the tab order. */}
            <div
              id={panelId}
              data-folded={open ? undefined : ""}
              className={cn(
                "grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none",
                open ? "visible grid-rows-[1fr]" : "invisible grid-rows-[0fr]",
              )}
            >
              <div className="flex min-h-0 flex-col gap-1 overflow-hidden">
                {group.items.map((item) => {
                  const isActive = activeKey === item.key;
                  const count = item.badge ? badgeCount[item.badge] : 0;
                  return (
                    <Link
                      key={item.key}
                      ref={isActive ? activeRef : undefined}
                      href={adminHref(locale, item.segment)}
                      aria-current={isActive ? "page" : undefined}
                      title={compact ? t(item.key) : undefined}
                      className={cn(
                        "relative flex min-h-touch shrink-0 items-center gap-3 rounded-DEFAULT px-3 text-sm font-medium transition-colors",
                        compact && "justify-center px-0",
                        isActive ? "text-nav-fg" : "text-nav-muted hover:bg-nav-fg/5 hover:text-nav-fg",
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                      {!compact && <span className="flex-1 truncate">{t(item.key)}</span>}
                      {count > 0 &&
                        (compact ? (
                          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-warning" aria-label={String(count)} />
                        ) : (
                          <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning">
                            {count}
                          </span>
                        ))}
                      {!compact && item.comingSoon && (
                        <span className="rounded bg-nav-fg/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-nav-muted">
                          {t("soon")}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
