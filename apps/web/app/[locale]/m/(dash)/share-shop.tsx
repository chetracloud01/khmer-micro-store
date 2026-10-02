"use client";

import { getMissingForSharing } from "@khmer-micro-store/shared";
import { Button, Card } from "@khmer-micro-store/ui";
import { Check, Copy, Download, Share2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { copyText, shareOrCopyLink } from "@/components/share-link";
import { api } from "@/lib/api";
import { useMerchant } from "./merchant-context";

/**
 * "Share your shop": the link to copy or send, and a QR code to download and
 * print for the counter or a sticker. Any of these marks the link as shared
 * — the setup checklist's last step. Shown once the shop is ready for buyers
 * (packages/shared getMissingForSharing): before that, the link would lead
 * them to a shop they can't buy from.
 */
export function ShareShop() {
  const t = useTranslations("Share");
  const locale = useLocale();
  const { store, refreshStore } = useMerchant();
  const ready = getMissingForSharing({ businessType: store.businessType, shopPhone: store.phone, ...store.readiness }).length === 0;
  const [url, setUrl] = useState("");
  const [qr, setQr] = useState<string | null>(null);
  const [note, setNote] = useState<"copied" | "shared" | "manual" | null>(null);

  useEffect(() => {
    const link = `${window.location.origin}/${locale}/s/${store.slug}`;
    setUrl(link);
    void QRCode.toDataURL(link, { margin: 2, width: 600, errorCorrectionLevel: "M" }).then(setQr);
  }, [locale, store.slug]);

  if (!ready) return null;

  async function markShared() {
    if (store.linkShared) return;
    await api("/store/link-shared", { method: "POST" }).catch(() => undefined);
    await refreshStore().catch(() => undefined);
  }

  async function share() {
    const outcome = await shareOrCopyLink(store.name, url);
    if (outcome === "cancelled") return;
    setNote(outcome === "manual" ? "manual" : outcome);
    if (outcome !== "manual") await markShared();
  }

  async function copy() {
    if (!(await copyText(url))) {
      setNote("manual");
      return;
    }
    setNote("copied");
    await markShared();
  }

  return (
    <Card className="flex flex-col gap-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted">{t("body")}</p>
        </div>
        {store.linkShared && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {t("shared")}
          </span>
        )}
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-muted">{t("linkLabel")}</span>
        <input readOnly value={url} onFocus={(event) => event.currentTarget.select()} className="min-h-touch w-full rounded-DEFAULT border border-border bg-bg px-3 text-base text-fg" />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" onClick={() => void share()}>
          <Share2 className="h-4 w-4" aria-hidden="true" />
          {t("share")}
        </Button>
        <Button variant="secondary" onClick={() => void copy()}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          {t("copy")}
        </Button>
      </div>
      {note && (
        <p role="status" className="text-sm text-muted">
          {note === "manual" ? t("manual") : note === "copied" ? t("copied") : t("sharedNow")}
        </p>
      )}

      {qr && (
        <div className="flex items-center gap-4 rounded-2xl border border-border p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- a QR code made in the browser */}
          <img src={qr} alt={t("qrAlt")} width={112} height={112} className="h-28 w-28 shrink-0 rounded-DEFAULT bg-white" />
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-sm text-muted">{t("qrBody")}</p>
            <a href={qr} download={`${store.slug}-qr.png`} onClick={() => void markShared()} className="flex min-h-touch items-center gap-2 text-sm font-medium text-brand">
              <Download className="h-4 w-4" aria-hidden="true" />
              {t("download")}
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}
