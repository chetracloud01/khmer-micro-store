import { describe, expect, it } from "vitest";
import { toFieldErrors } from "./form-errors";
import { isPromotionLive, siteLinkSchema, siteSectionSchema, visibleSections, waitlistSignupSchema } from "./site";

const text = (km: string, en: string) => ({ km, en });

const promotion = {
  id: "promo-1",
  visible: true,
  type: "promotion" as const,
  title: text("ខែដំបូងឥតគិតថ្លៃ", "First month free"),
  line: text("សម្រាប់ហាងថ្មី", "For new shops"),
  startsAt: "2026-11-01T00:00:00+07:00",
  endsAt: "2026-12-01T00:00:00+07:00",
};

describe("site content", () => {
  it("needs both languages", () => {
    const result = siteSectionSchema.safeParse({ ...promotion, title: text("", "First month free") });
    expect(result.success).toBe(false);
    if (!result.success) expect(toFieldErrors(result.error)["title.km"]).toBe("required");
  });

  it("takes only site pages and https links", () => {
    const link = (href: string) => siteLinkSchema.safeParse({ label: text("មើល", "See"), href }).success;
    expect(link("/pricing")).toBe(true);
    expect(link("/products/shop")).toBe(true);
    expect(link("https://t.me/khmio")).toBe(true);
    expect(link("#waitlist")).toBe(true);
    expect(link("#<script>")).toBe(false);
    expect(link("http://example.com")).toBe(false);
    expect(link("javascript:alert(1)")).toBe(false);
    expect(link("//evil.example")).toBe(false);
  });

  it("refuses a promotion that ends before it starts", () => {
    const result = siteSectionSchema.safeParse({ ...promotion, endsAt: "2026-10-01T00:00:00+07:00" });
    expect(result.success).toBe(false);
    if (!result.success) expect(toFieldErrors(result.error).endsAt).toBe("ends_before_start");
  });

  it("shows a promotion only while it runs", () => {
    expect(isPromotionLive(promotion, new Date("2026-10-31T23:59:59+07:00"))).toBe(false);
    expect(isPromotionLive(promotion, new Date("2026-11-01T00:00:00+07:00"))).toBe(true);
    expect(isPromotionLive(promotion, new Date("2026-12-01T00:00:00+07:00"))).toBe(false);
  });

  it("leaves out switched-off sections and promotions that aren't running", () => {
    const closing = { id: "end", visible: false, type: "closing" as const, headline: text("ចាប់ផ្តើម", "Start"), line: text("ឥតគិតថ្លៃ", "Free"), button: { label: text("ចាប់ផ្តើម", "Start"), href: "/" } };
    const page = { sections: [promotion, closing] };
    expect(visibleSections(page, new Date("2026-11-15T12:00:00+07:00")).map((s) => s.id)).toEqual(["promo-1"]);
    expect(visibleSections(page, new Date("2027-01-01T12:00:00+07:00"))).toEqual([]);
  });

  it("checks a waitlist sign-up and saves the phone in one form", () => {
    const ok = waitlistSignupSchema.safeParse({ product: "class", name: "Dara", phone: "012 345 678", businessType: "teacher" });
    expect(ok.success && ok.data.phone).toBe("85512345678");
    const bad = waitlistSignupSchema.safeParse({ product: "class", name: "D", phone: "123", businessType: undefined });
    expect(bad.success).toBe(false);
    if (!bad.success) expect(toFieldErrors(bad.error)).toEqual({ name: "too_short", phone: "phone_invalid", businessType: "required" });
  });
});
