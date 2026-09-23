"use client";

import { Button } from "@khmer-micro-store/ui";
import { Check, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { mockMerchant } from "@/mock/mock-data";

type LoginStatus = "idle" | "verifying" | "loggedIn";

export default function MerchantLoginMockupPage() {
  const t = useTranslations("MerchantLogin");
  const [status, setStatus] = useState<LoginStatus>("idle");

  // Mock only: a real Telegram Login Widget posts a signed payload here,
  // which the server verifies against the bot token and rejects if older
  // than 24 hours (see docs/blueprint.md Security section). There is no
  // merchant backend yet, so this just simulates that round trip.
  function handleLogin() {
    setStatus("verifying");
    setTimeout(() => setStatus("loggedIn"), 900);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[480px] flex-col items-center justify-center gap-4 bg-bg p-4 text-center text-fg">
      {status === "loggedIn" ? (
        <>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
            <Check className="h-8 w-8 text-success" aria-hidden="true" />
          </span>
          <p className="text-lg font-semibold">
            {t("loggedInAs", { name: `${mockMerchant.firstName} ${mockMerchant.lastName}` })}
          </p>
          <p className="text-sm text-muted">{t("onboardingNotBuilt")}</p>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
