import type { Metadata } from "next";
import type { PublicOrder } from "@/lib/api";
import { OrderView } from "./order-view";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// The buyer's order page (design/screens.md B6). The link's random token is
// the only key — the order number alone opens nothing. Never cached: the
// status changes as the shop works on the order.
export const metadata: Metadata = { robots: { index: false, follow: false } };

async function loadOrder(token: string): Promise<PublicOrder | null> {
  const response = await fetch(`${API_URL}/public/orders/${encodeURIComponent(token)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`order page: API answered ${response.status}`);
  return (await response.json()) as PublicOrder;
}

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OrderView order={await loadOrder(token)} token={token} />;
}
