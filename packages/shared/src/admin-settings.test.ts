import { describe, expect, it } from "vitest";
import { adminSettingsSchema, DEFAULT_ADMIN_SETTINGS } from "./admin-settings";

describe("admin settings", () => {
  it("accepts the defaults", () => {
    expect(adminSettingsSchema.safeParse(DEFAULT_ADMIN_SETTINGS).success).toBe(true);
  });

  it("rejects a malformed Telegram username", () => {
    const result = adminSettingsSchema.safeParse({ ...DEFAULT_ADMIN_SETTINGS, supportTelegram: "@ab" });
    expect(result.success).toBe(false);
  });

  it("rejects an exchange-rate band where max is not above min", () => {
    const result = adminSettingsSchema.safeParse({ ...DEFAULT_ADMIN_SETTINGS, usdToKhrMin: 4300, usdToKhrMax: 4100 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["usdToKhrMax"]);
  });

  it("allows alerts off, or a numeric chat ID", () => {
    expect(adminSettingsSchema.safeParse({ ...DEFAULT_ADMIN_SETTINGS, alertChatId: "-1001234567890" }).success).toBe(true);
    expect(adminSettingsSchema.safeParse({ ...DEFAULT_ADMIN_SETTINGS, alertChatId: "abc" }).success).toBe(false);
  });
});
