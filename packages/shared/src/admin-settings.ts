import { z } from "zod";

// Platform-wide settings the super admin edits. The same schema validates the
// admin form now and the API request later.
export const adminSettingsSchema = z
  .object({
    platformName: z.string().trim().min(2).max(60),
    /** Telegram usernames: 5–32 letters, digits or underscores, optional leading @. */
    supportTelegram: z.string().trim().regex(/^@?[A-Za-z0-9_]{5,32}$/),
    /** The band a merchant's USD→KHR rate is clamped to (docs/blueprint.md "Multi-currency pricing"). */
    usdToKhrMin: z.number().int().min(3000).max(6000),
    usdToKhrMax: z.number().int().min(3000).max(6000),
    /** Telegram chat that receives platform alerts. Empty = alerts off. */
    alertChatId: z.union([z.literal(""), z.string().trim().regex(/^-?\d{5,20}$/)]),
  })
  .refine((settings) => settings.usdToKhrMin < settings.usdToKhrMax, { path: ["usdToKhrMax"] });

export type AdminSettings = z.infer<typeof adminSettingsSchema>;

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  platformName: "Khmer Micro-Store",
  supportTelegram: "@kms_support",
  usdToKhrMin: 3900,
  usdToKhrMax: 4300,
  alertChatId: "",
};
