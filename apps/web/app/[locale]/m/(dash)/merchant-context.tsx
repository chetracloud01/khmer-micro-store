"use client";

import { createContext, useContext } from "react";
import type { Me, StoreDetails } from "@/lib/api";

export interface MerchantContextValue {
  me: Me;
  /** GET /store: the shop's details, plan and setup facts. */
  store: StoreDetails;
  /** Reads the shop again after something changed it (a product added, details saved). */
  refreshStore: () => Promise<void>;
}

export const MerchantContext = createContext<MerchantContextValue | null>(null);

/** The signed-in merchant and their shop, loaded once by the dashboard layout. */
export function useMerchant(): MerchantContextValue {
  const value = useContext(MerchantContext);
  if (!value) throw new Error("useMerchant must be used inside the dashboard layout");
  return value;
}
