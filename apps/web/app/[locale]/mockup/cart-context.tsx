"use client";

import type { Currency } from "@khmer-micro-store/shared";
import { createContext, useContext, useEffect, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { mockStore, type MockPromoCode } from "@/mock/mock-data";

export type Area = "phnom_penh" | "province";

export interface OrderLineSnapshot {
  key: string;
  label: string;
  qty: number;
  lineTotal: number;
}

/** A completed order, captured once at payment success so it survives the cart being cleared. */
export interface OrderSnapshot {
  orderNumber: string;
  currency: Currency;
  total: number;
  lines: OrderLineSnapshot[];
  name: string;
  phone: string;
  area: Area;
  landmark: string;
  placedAtIso: string;
}

interface CartContextValue {
  quantities: Record<string, number>;
  setQuantities: Dispatch<SetStateAction<Record<string, number>>>;
  appliedPromo: MockPromoCode | null;
  setAppliedPromo: Dispatch<SetStateAction<MockPromoCode | null>>;
  /** The currency chosen at checkout; carried through to the KHQR payment screen so both agree on the same amount. */
  currency: Currency;
  setCurrency: Dispatch<SetStateAction<Currency>>;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  phone: string;
  setPhone: Dispatch<SetStateAction<string>>;
  area: Area;
  setArea: Dispatch<SetStateAction<Area>>;
  landmark: string;
  setLandmark: Dispatch<SetStateAction<string>>;
  lastOrder: OrderSnapshot | null;
  setLastOrder: Dispatch<SetStateAction<OrderSnapshot | null>>;
  /** Resets the active cart (items + promo) once an order is placed; keeps buyer details for next time. */
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

// Switching locale changes the [locale] URL segment, which remounts this
// provider — localStorage is what survives that (and a page refresh).
const STORAGE_KEY = "khmer-micro-store:mockup-cart";

interface PersistedCart {
  quantities: Record<string, number>;
  appliedPromo: MockPromoCode | null;
  currency: Currency;
  name: string;
  phone: string;
  area: Area;
  landmark: string;
  lastOrder: OrderSnapshot | null;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [appliedPromo, setAppliedPromo] = useState<MockPromoCode | null>(null);
  const [currency, setCurrency] = useState<Currency>(mockStore.defaultCurrency);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState<Area>("phnom_penh");
  const [landmark, setLandmark] = useState("");
  const [lastOrder, setLastOrder] = useState<OrderSnapshot | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Read persisted cart client-side only, after the initial (empty) render
  // matches the server-rendered HTML — avoids a hydration mismatch.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PersistedCart>;
        if (parsed.quantities) setQuantities(parsed.quantities);
        if (parsed.appliedPromo) setAppliedPromo(parsed.appliedPromo);
        if (parsed.currency) setCurrency(parsed.currency);
        if (parsed.name) setName(parsed.name);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.area) setArea(parsed.area);
        if (parsed.landmark) setLandmark(parsed.landmark);
        if (parsed.lastOrder) setLastOrder(parsed.lastOrder);
      }
    } catch {
      // Corrupt or inaccessible storage (e.g. private browsing) — start empty.
    } finally {
      setHydrated(true);
    }
  }, []);

  // Persist on every change, but only once the read above has run, so we
  // don't immediately clobber saved data with the pre-hydration empty state.
  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: PersistedCart = {
        quantities,
        appliedPromo,
        currency,
        name,
        phone,
        area,
        landmark,
        lastOrder,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage full or unavailable — cart just won't persist this time.
    }
  }, [quantities, appliedPromo, currency, name, phone, area, landmark, lastOrder, hydrated]);

  function clearCart() {
    setQuantities({});
    setAppliedPromo(null);
  }

  return (
    <CartContext.Provider
      value={{
        quantities,
        setQuantities,
        appliedPromo,
        setAppliedPromo,
        currency,
        setCurrency,
        name,
        setName,
        phone,
        setPhone,
        area,
        setArea,
        landmark,
        setLandmark,
        lastOrder,
        setLastOrder,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
