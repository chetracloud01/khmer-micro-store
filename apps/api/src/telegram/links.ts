import { TELEGRAM_LINK_MINUTES, telegramStartLink } from "@khmer-micro-store/shared";
import { createHash, randomBytes } from "node:crypto";
import { getEnv } from "../config";
import { AppException } from "../errors";

// t.me links with a one-time code: "Add the bot to your staff group"
// (startgroup) and "Get updates on Telegram" (start). The API only writes
// the code's hash; the worker reads it when the person presses Start.

let cachedUsername: string | null = null;

/** The bot's @username, asked from Telegram once (getMe) — so it always matches the token in use. */
export async function botUsername(): Promise<string> {
  if (cachedUsername) return cachedUsername;
  const token = getEnv().TELEGRAM_BOT_TOKEN;
  if (!token) throw new AppException(503, "telegram_not_configured");
  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  const data = (await response?.json().catch(() => null)) as { ok?: boolean; result?: { username?: string } } | null;
  if (!data?.ok || !data.result?.username) throw new AppException(503, "telegram_not_configured");
  cachedUsername = data.result.username;
  return cachedUsername;
}

export function hashLinkCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** A fresh code ("g_…" or "f_…"), its hash, and when it stops working. */
export function newLinkCode(kind: "group_link" | "order_follow"): { code: string; codeHash: string; expiresAt: Date } {
  const code = `${kind === "group_link" ? "g" : "f"}_${randomBytes(18).toString("base64url")}`;
  return { code, codeHash: hashLinkCode(code), expiresAt: new Date(Date.now() + TELEGRAM_LINK_MINUTES * 60_000) };
}

export async function linkFor(code: string, group: boolean): Promise<string> {
  return telegramStartLink(await botUsername(), code, group);
}
