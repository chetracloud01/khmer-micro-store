import { z } from "zod";
import { khmerPhoneSchema } from "./phone";

// Merchant sign-in (docs/blueprint.md "Security"). Sign-up and log-in are one
// flow: the first verified login creates the account. One merchant can link
// several methods, so losing one never locks them out.

export const loginMethodSchema = z.enum(["telegram", "phone", "google"]);
export type LoginMethod = z.infer<typeof loginMethodSchema>;

/** Methods offered on the login screen today. Google is planned (add it here when it ships). */
export const ENABLED_LOGIN_METHODS: readonly LoginMethod[] = ["telegram", "phone"];

// SMS one-time codes. The API enforces these; the screen mirrors them.
export const OTP_LENGTH = 6;
/** A code works for 5 minutes. */
export const OTP_TTL_SECONDS = 300;
/** Wrong guesses before the code is burned and a new one must be sent. */
export const OTP_MAX_ATTEMPTS = 5;
/** Wait before "Resend code" works again. */
export const OTP_RESEND_SECONDS = 60;

export const phoneLoginSchema = z.object({ phone: khmerPhoneSchema });

export const otpCodeSchema = z
  .string()
  .transform((value) => value.replace(/\s/g, ""))
  .pipe(z.string().regex(new RegExp(`^\\d{${OTP_LENGTH}}$`), "otp_invalid"));

/**
 * What the Telegram Login Widget hands the browser after the merchant taps
 * "Log in with Telegram". The API checks its signature with the bot token
 * before trusting any of it (apps/api auth/telegram.ts).
 */
export const telegramLoginPayloadSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().min(1).max(256),
  last_name: z.string().max(256).optional(),
  username: z.string().max(64).optional(),
  photo_url: z.string().url().max(2048).optional(),
  /** Unix seconds when Telegram signed it. */
  auth_date: z.number().int().positive(),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type TelegramLoginPayload = z.infer<typeof telegramLoginPayloadSchema>;

/** A Telegram login older than this is refused, so a copied payload can't be replayed later. */
export const TELEGRAM_LOGIN_MAX_AGE_SECONDS = 24 * 60 * 60;

/** How long a merchant stays signed in on one device. */
export const SESSION_TTL_DAYS = 30;

/** Unlinking is allowed only while another method remains — never leave an account with no way in. */
export function canUnlinkLoginMethod(linkedCount: number): boolean {
  return linkedCount > 1;
}
