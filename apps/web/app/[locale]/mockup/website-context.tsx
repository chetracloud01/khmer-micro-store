"use client";

import { sitePageSchema, type SitePage } from "@khmer-micro-store/shared";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { mockComingSoonPages, mockHomePage, mockPricingPage, mockShopPage } from "@/mock/mock-site";
import { SITE_PAGE_KEYS, type SitePageKey } from "./site-pages";

// The platform website's content, as the admin edits it (design/screens.md
// A10): every page has what visitors see (published), the admin's working
// copy (draft) and every earlier published version (history). The website
// mockups show `published`; the admin's Preview shows `draft`. The real
// thing keeps the same three in platform tables.

export { SITE_PAGE_INFO, SITE_PAGE_KEYS, type SitePageKey } from "./site-pages";

export interface SiteVersion {
  version: number;
  /** ISO time it was published. */
  at: string;
  by: string;
  page: SitePage;
}

export interface SitePageState {
  published: SitePage;
  draft: SitePage;
  /** Newest first; history[0] is what's published now. */
  history: SiteVersion[];
}

const SEED_PAGES: Record<SitePageKey, SitePage> = {
  home: mockHomePage,
  shop: mockShopPage,
  class: mockComingSoonPages.class,
  rent: mockComingSoonPages.rent,
  pricing: mockPricingPage,
};

const SEED_AT = "2026-10-06T09:00:00+07:00";

function seed(): Record<SitePageKey, SitePageState> {
  const pages = {} as Record<SitePageKey, SitePageState>;
  for (const key of SITE_PAGE_KEYS) {
    pages[key] = { published: SEED_PAGES[key], draft: SEED_PAGES[key], history: [{ version: 1, at: SEED_AT, by: "Admin (mock)", page: SEED_PAGES[key] }] };
  }
  return pages;
}

export type PublishResult = { ok: true } | { ok: false; issues: { path: string; code: string }[] };

interface WebsiteContextValue {
  hydrated: boolean;
  pages: Record<SitePageKey, SitePageState>;
  hasChanges: (key: SitePageKey) => boolean;
  saveDraft: (key: SitePageKey, page: SitePage) => void;
  discardDraft: (key: SitePageKey) => void;
  /** Refuses a draft that breaks the site kit's rules (missing Khmer or English, a bad link…) and says where. */
  publish: (key: SitePageKey, by: string) => PublishResult;
  /** Makes an earlier version the draft; it goes live only when published. */
  restore: (key: SitePageKey, version: number) => void;
}

const WebsiteContext = createContext<WebsiteContextValue | null>(null);
const STORAGE_KEY = "khmer-micro-store:mockup-website";

export function WebsiteProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<Record<SitePageKey, SitePageState>>(seed);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setPages({ ...seed(), ...(JSON.parse(raw) as Partial<Record<SitePageKey, SitePageState>>) });
    } catch {
      // Unreadable or blocked storage: start from the sample content.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pages));
    } catch {
      // Storage full or blocked: changes last until the page is reloaded.
    }
  }, [pages, hydrated]);

  // The admin's Preview opens in another frame; pick up its saved draft there too.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        setPages({ ...seed(), ...(JSON.parse(event.newValue) as Partial<Record<SitePageKey, SitePageState>>) });
      } catch {
        // Ignore a half-written value.
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value: WebsiteContextValue = {
    hydrated,
    pages,
    hasChanges: (key) => JSON.stringify(pages[key].draft) !== JSON.stringify(pages[key].published),
    saveDraft: (key, page) => setPages((current) => ({ ...current, [key]: { ...current[key], draft: page } })),
    discardDraft: (key) => setPages((current) => ({ ...current, [key]: { ...current[key], draft: current[key].published } })),
    publish: (key, by) => {
      const result = sitePageSchema.safeParse(pages[key].draft);
      if (!result.success) return { ok: false, issues: result.error.issues.map((issue) => ({ path: issue.path.join("."), code: issue.message })) };
      setPages((current) => {
        const state = current[key];
        const version = (state.history[0]?.version ?? 0) + 1;
        return { ...current, [key]: { published: state.draft, draft: state.draft, history: [{ version, at: new Date().toISOString(), by, page: state.draft }, ...state.history] } };
      });
      return { ok: true };
    },
    restore: (key, version) =>
      setPages((current) => {
        const found = current[key].history.find((entry) => entry.version === version);
        return found ? { ...current, [key]: { ...current[key], draft: found.page } } : current;
      }),
  };

  return <WebsiteContext.Provider value={value}>{children}</WebsiteContext.Provider>;
}

export function useWebsite() {
  const value = useContext(WebsiteContext);
  if (!value) throw new Error("useWebsite must be used inside WebsiteProvider");
  return value;
}
