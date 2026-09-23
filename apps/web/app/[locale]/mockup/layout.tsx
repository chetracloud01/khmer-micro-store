import type { ReactNode } from "react";
import { CartProvider } from "./cart-context";

export default function MockupLayout({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}
