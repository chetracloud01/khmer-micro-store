"use client";

import { useLocale } from "next-intl";
import { mockStore } from "@/mock/mock-data";
import { useMerchantProfile } from "./merchant-profile-context";

/**
 * Who the shop is, as buyers see it: the seller's own profile once they've
 * onboarded, the sample shop before that. Every buyer screen reads this, so
 * the name on the shop page, the cart and the KHQR card always agree.
 */
export function useShopIdentity() {
  const locale = useLocale();
  const profile = useMerchantProfile();
  const name = profile.hasProfile ? profile.shopName : locale === "km" ? mockStore.nameKm : mockStore.nameEn;
  return {
    hydrated: profile.hydrated,
    name,
    initial: name.charAt(0),
    logoDataUrl: profile.hasProfile ? profile.logoDataUrl : null,
    /** 855XXXXXXXX, or "" when the seller hasn't given one. */
    phone: profile.hasProfile ? profile.phone : mockStore.phone,
  };
}
