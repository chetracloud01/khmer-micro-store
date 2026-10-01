"use client";

import type { TelegramLoginPayload } from "@khmer-micro-store/shared";
import { Button, Card } from "@khmer-micro-store/ui";
import { FlaskConical, Send } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, getMe } from "@/lib/api";
import { AppFrame, AppLoading, AppOffline } from "../app-frame";

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
/** The API refuses the development login in production too; this only hides the buttons. */
const SHOW_DEV_LOGIN = process.env.NODE_ENV !== "production";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramLoginPayload) => void;
  }
}

/**
 * Telegram's own "Log in with Telegram" button. It only works on the web
 * address set for the bot in @BotFather (/setdomain) — not on localhost.
 */
function TelegramButton({ onLogin }: { onLogin: (user: TelegramLoginPayload) => void }) {
  const holder = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!BOT_USERNAME || !holder.current) return;
    window.onTelegramAuth = onLogin;
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    holder.current.appendChild(script);
    const current = holder.current;
    return () => {
      current.innerHTML = "";
      delete window.onTelegramAuth;
    };
  }, [onLogin]);
  return <div ref={holder} className="flex min-h-[48px] justify-center" />;
}

// Real merchant login (roadmap step 2). Sign-up and log-in are one flow:
// the first login creates the account, then onboarding asks two questions.
export default function LoginPage() {
  const t = useTranslations("App");
  const locale = useLocale();
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ready" | "offline">("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(() => {
    setState("checking");
    getMe()
      .then((me) => (me ? router.replace(`/${locale}/m`) : setState("ready")))
      .catch(() => setState("offline"));
  }, [locale, router]);
  useEffect(check, [check]);

  async function signIn(path: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      await api(path, { method: "POST", body });
      router.replace(`/${locale}/m`);
    } catch (caught) {
      setError(caught instanceof ApiError && caught.status === 0 ? t("offlineBody") : t("loginFailed"));
      setBusy(false);
    }
  }

  const onTelegram = useCallback((user: TelegramLoginPayload) => void signIn("/auth/telegram", user), []); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === "checking") return <AppLoading />;
  if (state === "offline") return <AppOffline onRetry={check} />;

  return (
    <AppFrame>
      <div className="flex flex-col gap-2 pt-6 text-center">
        <h1 className="text-2xl font-bold">{t("loginTitle")}</h1>
        <p className="text-sm text-muted">{t("loginSubtitle")}</p>
      </div>

      <Card className="flex flex-col gap-3 p-4">
        {BOT_USERNAME ? (
          <TelegramButton onLogin={onTelegram} />
        ) : (
          <p className="flex items-start gap-2 text-sm text-muted">
            <Send className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {t("telegramNotSetUp")}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
      </Card>

      {SHOW_DEV_LOGIN && (
        <Card className="flex flex-col gap-3 border-dashed p-4">
          <div className="flex items-start gap-2">
            <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold">{t("devLoginTitle")}</p>
              <p className="text-sm text-muted">{t("devLoginHint")}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["a", "b"] as const).map((who) => (
              <Button key={who} variant="secondary" disabled={busy} onClick={() => void signIn("/auth/dev-login", { as: who })}>
                {t("devLoginAs", { name: who.toUpperCase() })}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </AppFrame>
  );
}
