import type { Tx } from "@khmio/db";
import { isCashOrder, needsSellerAction, type Currency, type OrderStatus, type PaymentMethod } from "@khmio/shared";

// The seller's home page numbers (design/screens.md S3), worked out by the
// database so they stay right however many orders a shop has. Days are
// Phnom Penh days (UTC+7, no daylight saving). Dollars and riel are always
// kept apart — a riel order is never converted (docs/blueprint.md
// "Multi-currency pricing and totals").

export const SUMMARY_DAYS = 30;
export const BEST_SELLERS = 5;
const PHNOM_PENH_OFFSET_MS = 7 * 60 * 60 * 1000;
/** Orders that count as sales: not cancelled, and not still waiting for an online payment. */
const NOT_SALES = ["cancelled", "awaiting_payment"];

export type Money = Record<Currency, number>;

export interface SellerSummary {
  /** Orders the seller still has a step to do on (needsSellerAction). */
  waiting: number;
  salesToday: Money;
  /** Cash orders not yet completed: money with the buyer or a driver. */
  cashToCollect: Money;
  ordersLast7Days: number;
  ordersPrevious7Days: number;
  /** Oldest first, SUMMARY_DAYS days ending today, days without sales included. */
  days: { date: string; orders: number; USD: number; KHR: number }[];
  /** This week's best sellers by quantity. */
  bestSellers: { nameKm: string; nameEn: string; quantity: number }[];
}

export interface OpenRow {
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  currency: Currency;
  orders: number;
  total: number;
}
export interface DayRow {
  day: string;
  currency: Currency;
  orders: number;
  total: number;
}
export interface BestRow {
  nameKm: string;
  nameEn: string;
  quantity: number;
}

/** "2026-10-08": the Phnom Penh date `daysAgo` days before `now`. */
export function phnomPenhDate(now: Date, daysAgo = 0): string {
  return new Date(now.getTime() + PHNOM_PENH_OFFSET_MS - daysAgo * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const emptyMoney = (): Money => ({ USD: 0, KHR: 0 });

/** The answer from the three grouped queries; pure, so it's tested without a database. */
export function buildSummary(open: OpenRow[], daily: DayRow[], best: BestRow[], now: Date): SellerSummary {
  const waiting = open.filter((row) => needsSellerAction(row.status)).reduce((sum, row) => sum + row.orders, 0);
  const cashToCollect = emptyMoney();
  for (const row of open) if (isCashOrder(row)) cashToCollect[row.currency] += row.total;

  const days = Array.from({ length: SUMMARY_DAYS }, (_, index) => ({ date: phnomPenhDate(now, SUMMARY_DAYS - 1 - index), orders: 0, USD: 0, KHR: 0 }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const row of daily) {
    const day = byDate.get(row.day);
    if (!day) continue;
    day.orders += row.orders;
    day[row.currency] += row.total;
  }
  const today = days[days.length - 1]!;
  const countDays = (from: number, to: number) => days.slice(days.length - to, days.length - from).reduce((sum, day) => sum + day.orders, 0);

  return {
    waiting,
    salesToday: { USD: today.USD, KHR: today.KHR },
    cashToCollect,
    ordersLast7Days: countDays(0, 7),
    ordersPrevious7Days: countDays(7, 14),
    days,
    bestSellers: best.slice(0, BEST_SELLERS),
  };
}

/** Runs the three queries for this shop (inside withContext: row-level security applies, and every query also filters by store). */
export async function sellerSummary(tx: Tx, storeId: string, now = new Date()): Promise<SellerSummary> {
  const since = phnomPenhDate(now, SUMMARY_DAYS - 1);
  const weekStart = phnomPenhDate(now, 6);
  // One after another: queries inside a transaction share its one connection.
  const open = await tx.$queryRaw<{ status: OrderStatus; paymentMethod: PaymentMethod; currency: Currency; orders: bigint; total: bigint }[]>`
      SELECT status, payment_method AS "paymentMethod", currency, count(*) AS orders, coalesce(sum(total_minor), 0) AS total
      FROM orders
      WHERE store_id = ${storeId}::uuid AND status::text NOT IN ('completed', 'cancelled')
      GROUP BY 1, 2, 3`;
  const daily = await tx.$queryRaw<{ day: string; currency: Currency; orders: bigint; total: bigint }[]>`
      SELECT to_char((created_at AT TIME ZONE 'Asia/Phnom_Penh')::date, 'YYYY-MM-DD') AS day, currency, count(*) AS orders, coalesce(sum(total_minor), 0) AS total
      FROM orders
      WHERE store_id = ${storeId}::uuid
        AND status::text NOT IN (${NOT_SALES[0]}, ${NOT_SALES[1]})
        AND created_at >= (${since}::date::timestamp AT TIME ZONE 'Asia/Phnom_Penh')
      GROUP BY 1, 2`;
  const best = await tx.$queryRaw<{ nameKm: string; nameEn: string; quantity: bigint }[]>`
      SELECT item.title_km AS "nameKm", item.title_en AS "nameEn", sum(item.quantity) AS quantity
      FROM order_items item
      JOIN orders ON orders.id = item.order_id AND orders.store_id = ${storeId}::uuid
      WHERE item.store_id = ${storeId}::uuid
        AND orders.status::text NOT IN (${NOT_SALES[0]}, ${NOT_SALES[1]})
        AND orders.created_at >= (${weekStart}::date::timestamp AT TIME ZONE 'Asia/Phnom_Penh')
      GROUP BY 1, 2
      ORDER BY quantity DESC, 2
      LIMIT ${BEST_SELLERS}`;
  return buildSummary(
    open.map((row) => ({ ...row, orders: Number(row.orders), total: Number(row.total) })),
    daily.map((row) => ({ ...row, orders: Number(row.orders), total: Number(row.total) })),
    best.map((row) => ({ ...row, quantity: Number(row.quantity) })),
    now,
  );
}
