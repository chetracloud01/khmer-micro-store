"use client";

import { Button, SegmentedControl } from "@khmer-micro-store/ui";
import { Send, Store } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";

type LoginStatus = "idle" | "verifying";

export default function MerchantLoginMockupPage() {
  const t = useTranslations("MerchantLogin");
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<LoginStatus>("idle");

  // Mock only: a real Telegram Login Widget posts a signed payload here,
  // which the server verifies against the bot token and rejects if older
  // than 24 hours (see docs/blueprint.md Security section). There is no
  // merchant backend yet, so this just simulates that round trip.
  function handleLogin() {
    setStatus("verifying");
    setTimeout(() => router.push(`/${locale}/mockup/onboarding`), 900);
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-brand/10 via-bg to-bg p-4">
      <div className="absolute right-4 top-4">
        <SegmentedControl
          value={locale}
          onChange={(next) => router.push(`/${next}/mockup/merchant-login`)}
          options={[
            { value: "km", label: "ខ្មែរ" },
            { value: "en", label: "EN" },
          ]}
        />
      </div>

      <div className="flex w-full max-w-[400px] flex-col items-center gap-5 rounded-DEFAULT border border-border bg-bg p-8 text-center shadow-sm">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-white">
          <Store className="h-8 w-8" aria-hidden="true" />
        </span>

        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold text-fg">{t("title")}</h1>
          <p className="max-w-[280px] text-sm text-muted">{t("subtitle")}</p>
        </div>

        <Button
          variant="primary"
          onClick={handleLogin}
          loading={status === "verifying"}
          className="w-full bg-[#24A1DE] hover:bg-[#24A1DE]/90"
        >
          {status === "verifying" ? (
            t("verifying")
          ) : (
            <>
              <Send className="h-4 w-4" aria-hidden="true" />
              {t("loginButton")}
            </>
          )}
        </Button>

        <p className="max-w-[280px] text-xs text-muted">{t("mockNote")}</p>
      </div>
    </div>
  );
}
