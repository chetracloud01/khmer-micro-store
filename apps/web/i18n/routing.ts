import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["km", "en"],
  defaultLocale: "km",
});

export function isValidLocale(locale: string | undefined): locale is (typeof routing.locales)[number] {
  return !!locale && (routing.locales as readonly string[]).includes(locale);
}
