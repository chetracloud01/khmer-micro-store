"use client";

import type { TelegramLoginPayload } from "@khmer-micro-store/shared";
import { useEffect, useRef } from "react";

export const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
/** The API refuses the development login in production too; this only hides the buttons. */
export const SHOW_DEV_LOGIN = process.env.NODE_ENV !== "production";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramLoginPayload) => void;
  }
}

/**
 * Telegram's own "Log in with Telegram" button. It only works on the web
 * address set for the bot in @BotFather (/setdomain) — not on localhost.
 */
export function TelegramButton({ onLogin }: { onLogin: (user: TelegramLoginPayload) => void }) {
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
