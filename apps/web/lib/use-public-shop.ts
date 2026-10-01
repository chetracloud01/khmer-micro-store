"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, type PublicShop } from "./api";

/** The shop's public data for the cart and checkout pages: loading, the shop, "no such shop", or offline. */
export function usePublicShop(slug: string) {
  const [shop, setShop] = useState<PublicShop | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "not_found" | "offline">("loading");
  const load = useCallback(() => {
    setState("loading");
    api<PublicShop>(`/public/stores/${encodeURIComponent(slug)}`)
      .then((result) => {
        setShop(result);
        setState("ready");
      })
      .catch((error: unknown) => setState(error instanceof ApiError && error.status === 404 ? "not_found" : "offline"));
  }, [slug]);
  useEffect(load, [load]);
  return { shop, state, reload: load };
}
