"use client";

import { Button } from "@khmer-micro-store/ui";
import { Send } from "lucide-react";
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
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-4 bg-bg p-4 text-center text-fg">
      <h1 className="text-xl font-bold">{t("title")}</h1>
      <p className="max-w-[320px] text-sm text-muted">{t("subtitle")}</p>

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

      <p className="max-w-[320px] text-xs text-muted">{t("mockNote")}</p>
    </div>
  );
}
