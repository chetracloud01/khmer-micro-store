"use client";

import { visibleSections, type WaitlistSignup } from "@khmer-micro-store/shared";
import { AnnouncementBar, SegmentedControl, SiteFooter, SiteHeader, SiteSections, type SiteKitContext } from "@khmer-micro-store/ui";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { mockPlatformProducts } from "@/mock/mock-site";
import { SITE_PAGE_INFO, useWebsite, type SitePageKey } from "../website-context";
import { useFormErrorText } from "@/components/form-ui";

/**
 * Site paths in the content ("/pricing", "/products/class", "/start") become
 * mockup links here. The live site will map them to khmio.com instead —
 * that is the only difference between the two.
 */
function useSiteHref() {
  const locale = useLocale();
  return (path: string) => {
    if (path === "/start") return `/${locale}/mockup/merchant-login`;
    if (path === "/") return `/${locale}/mockup/site`;
    return `/${locale}/mockup/site${path}`;
  };
}

const WAITLIST_KEY = "khmer-micro-store:mockup-waitlist";

/** Mockup only: keeps a sign-up on this device. The live site sends it to the API instead. */
async function keepSignupOnDevice(signup: WaitlistSignup) {
  await new Promise((resolve) => setTimeout(resolve, 600));
  try {
    const saved = JSON.parse(window.localStorage.getItem(WAITLIST_KEY) ?? "[]") as unknown[];
    window.localStorage.setItem(WAITLIST_KEY, JSON.stringify([...saved, { ...signup, at: new Date().toISOString() }]));
  } catch {
    // Storage blocked (private window): the thank-you still shows; nothing to keep.
  }
}

/**
 * One platform website page: the announcement bar, header, the page's sections
 * and the footer. Shows what is published; the admin's Preview shows the draft.
 */
export function SitePageView({ pageKey, mode = "published" }: { pageKey: SitePageKey; mode?: "published" | "draft" }) {
  const website = useWebsite();
  const page = website.pages[pageKey][mode];
  const product = SITE_PAGE_INFO[pageKey].product;
  const t = useTranslations("Site");
  const errorText = useFormErrorText();
  const tMascot = useTranslations("Mascot");
  const tPlans = useTranslations("Plans");
  const tBilling = useTranslations("Billing");
  const locale = useLocale() === "en" ? "en" : "km";
  const router = useRouter();
  const pathname = usePathname();
  const href = useSiteHref();

  const sections = visibleSections(page, new Date());
  const announcement = sections.find((section) => section.type === "announcement");

  const ctx: SiteKitContext = {
    locale,
    href,
    products: mockPlatformProducts,
    labels: {
      comingSoon: t("comingSoon"),
      learnMore: t("learnMore"),
      joinWaitlist: t("joinWaitlist"),
      startFree: t("startFree"),
      sample: t("sample"),
      mio: tMascot("label"),
    },
    // The app's own plan wording, so the site and the billing screen always match.
    plans: {
      names: { free: tPlans("free"), basic: tPlans("basic"), pro: tPlans("pro"), advance: tPlans("advance") },
      perMonth: tBilling("perMonth"),
      usd: t("currencyUsd"),
      khr: t("currencyKhr"),
      productLimit: (count) => tBilling("featureProductLimit", { count }),
      unlimitedProducts: tBilling("featureUnlimitedProducts"),
      trial: (count) => tBilling("trialLength", { count }),
      features: { stock: tBilling("featureStock"), wholesalePrice: tBilling("featureWholesale"), warehouses: tBilling("featureWarehouses") },
      highlight: t("mostShops"),
      included: t("included"),
      notIncluded: t("notIncluded"),
      compareTitle: t("compareTitle"),
      compareFeature: t("compareFeature"),
      comparePrice: t("comparePrice"),
      compareProducts: t("compareProducts"),
      compareTrial: t("compareTrial"),
      unlimited: t("compareUnlimited"),
      none: t("compareNone"),
      days: (count) => t("compareDays", { count }),
    },
    waitlist: product && {
      product,
      submit: keepSignupOnDevice,
      note: t("waitlistMockNote"),
      labels: {
        name: t("waitlistName"),
        phone: t("waitlistPhone"),
        businessType: t("waitlistBusiness"),
        choose: t("waitlistChoose"),
        businessTypes: { teacher: t("waitlistTeacher"), school: t("waitlistSchool"), landlord: t("waitlistLandlord"), other: t("waitlistOther") },
        submit: t("waitlistSubmit"),
        privacy: t("waitlistPrivacy"),
        errorText: (code) => errorText(code) ?? "",
      },
    },
  };

  const languageSwitch = (
    <SegmentedControl
      value={locale}
      onChange={(next) => router.push(pathname.replace(/^\/(km|en)/, `/${next}`))}
      options={[
        { value: "km", label: "ខ្មែរ" },
        { value: "en", label: "EN" },
      ]}
    />
  );

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      {announcement?.type === "announcement" && <AnnouncementBar section={announcement} ctx={ctx} />}
      <SiteHeader
        homeHref={href("/")}
        links={[
          { label: t("products"), href: href("/products/shop") },
          { label: t("pricing"), href: href("/pricing") },
          { label: t("help"), href: href("/help") },
        ]}
        login={{ label: t("logIn"), href: href("/start") }}
        start={{ label: t("startFree"), href: href("/start") }}
        languageSwitch={languageSwitch}
        labels={{ openMenu: t("openMenu"), closeMenu: t("closeMenu"), home: t("home"), nav: t("nav") }}
      />
      <main className="flex-1">
        <SiteSections sections={sections} ctx={ctx} />
      </main>
      <SiteFooter
        homeHref={href("/")}
        tagline={t("tagline")}
        copyright={t("copyright")}
        groups={[
          { title: t("footerProducts"), links: mockPlatformProducts.map((product) => ({ label: product.name, href: href(`/products/${product.id}`) })) },
          {
            title: t("footerKhmio"),
            links: [
              { label: t("pricing"), href: href("/pricing") },
              { label: t("help"), href: href("/help") },
              { label: t("contact"), href: "https://t.me/khmio_support" },
            ],
          },
          {
            title: t("footerLegal"),
            links: [
              { label: t("terms"), href: href("/terms") },
              { label: t("privacy"), href: href("/privacy") },
            ],
          },
        ]}
      />
      <p className="bg-canvas px-4 pb-4 text-center text-xs text-muted">{t("mockNote")}</p>
    </div>
  );
}
