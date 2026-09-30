"use client";

import { Button, Card } from "@khmer-micro-store/ui";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { adminHref, ADMIN_NAV_ITEMS } from "../admin-nav";
import { ComingSoon, EmptyState, PageHeader } from "../admin-ui";

// Menu entries marked comingSoon in admin-nav.ts land here until they get
// their own folder (a real page folder always wins over this dynamic route).
// Any other URL shows "not found" inside the admin shell, so the menu stays usable.
export default function AdminComingSoonPage() {
  const t = useTranslations("AdminNav");
  const tAdmin = useTranslations("Admin");
  const locale = useLocale();
  const { section } = useParams<{ section: string }>();
  const item = ADMIN_NAV_ITEMS.find((candidate) => candidate.segment === section && candidate.comingSoon);

  if (!item) {
    return (
      <Card className="flex flex-col items-center gap-3 p-0 pb-8">
        <EmptyState title={tAdmin("pageNotFound")} body={tAdmin("pageNotFoundBody")} />
        <Link href={adminHref(locale, "")}>
          <Button variant="primary">{tAdmin("backToOverview")}</Button>
        </Link>
      </Card>
    );
  }

  return (
    <>
      <PageHeader title={t(item.key)} description={t(`${item.key}Description`)} />
      <ComingSoon title={tAdmin("comingSoonTitle")} body={tAdmin("comingSoonBody")} />
    </>
  );
}
