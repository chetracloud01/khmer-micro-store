"use client";

import { useCallback, useMemo } from "react";
import { useMerchantProducts } from "./merchant-products-context";

/**
 * The products a buyer can see and order: the seller's own list, minus the
 * ones switched to hidden. The shop page, cart and checkout all read this, so
 * a product hidden in the dashboard is gone from every buyer screen at once.
 */
export function useShopProducts() {
  const { hydrated, products: allProducts, categories } = useMerchantProducts();
  const products = useMemo(() => allProducts.filter((product) => !product.isHidden), [allProducts]);

  /** False for a product (or option) that was hidden or deleted after it went into a cart. */
  const isOnSale = useCallback(
    (productId: string, variantId?: string) => {
      const product = products.find((item) => item.id === productId);
      if (!product) return false;
      if (!product.variants?.length) return variantId === undefined;
      return product.variants.some((variant) => variant.id === variantId);
    },
    [products],
  );

  return { hydrated, products, categories, isOnSale };
}
