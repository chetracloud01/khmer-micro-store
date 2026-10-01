import { formatKhr, formatUsd, type Currency } from "./money";
import { PHNOM_PENH_DISTRICTS, PROVINCES } from "./locations";

// The Telegram messages the worker sends (docs/blueprint.md "Workflows from
// start to end", workflow 4). Khmer first, then English, in one message: the
// bot doesn't know which language each seller reads. Never the buyer's phone
// — a Telegram message can be forwarded, and the dashboard has it.

export interface OrderAlertFacts {
  orderNumber: number;
  totalMinor: number;
  currency: Currency;
  paymentMethod: "khqr" | "aba_payway" | "cod";
  fulfilment: "delivery" | "pickup";
  districtId: string | null;
  provinceId: string | null;
  itemCount: number;
}

const money = (amount: number, currency: Currency) => (currency === "USD" ? formatUsd(amount) : formatKhr(amount));

function place(facts: OrderAlertFacts): { km: string; en: string } {
  if (facts.fulfilment === "pickup") return { km: "មកយកផ្ទាល់", en: "Pickup" };
  const district = PHNOM_PENH_DISTRICTS.find((entry) => entry.id === facts.districtId);
  if (district) return { km: district.nameKm, en: district.nameEn };
  const province = PROVINCES.find((entry) => entry.id === facts.provinceId);
  return province ? { km: province.nameKm, en: province.nameEn } : { km: "", en: "" };
}

function payment(facts: OrderAlertFacts): { km: string; en: string } {
  if (facts.paymentMethod === "cod") return { km: "បង់ពេលទទួល", en: "Cash on delivery" };
  return { km: "បានបង់តាម KHQR", en: "Paid by KHQR" };
}

/** "New order #12" for the seller, with the total, how it's paid, where it goes and how many items. */
export function newOrderAlert(facts: OrderAlertFacts): string {
  const where = place(facts);
  const pay = payment(facts);
  const total = money(facts.totalMinor, facts.currency);
  return [
    `🛒 ការបញ្ជាទិញថ្មី #${facts.orderNumber} · ${total}`,
    `${pay.km} · ${where.km} · ${facts.itemCount} មុខ`,
    "",
    `New order #${facts.orderNumber} · ${total}`,
    `${pay.en} · ${where.en} · ${facts.itemCount} item${facts.itemCount === 1 ? "" : "s"}`,
  ].join("\n");
}

/** The buyer cancelled before anything was packed. */
export function buyerCancelledAlert(facts: Pick<OrderAlertFacts, "orderNumber">): string {
  return [`❌ អ្នកទិញបានបោះបង់ការបញ្ជាទិញ #${facts.orderNumber}`, "", `The buyer cancelled order #${facts.orderNumber}`].join("\n");
}

/** Button labels, both languages, short enough for a phone. */
export const ALERT_BUTTONS = {
  confirm: "✅ បញ្ជាក់ · Confirm",
  open: "📋 បើក · Open",
  confirmed: "✅ បានបញ្ជាក់ · Confirmed",
} as const;

/** What a Telegram button carries: the action and the order, nothing else (64 bytes at most). */
export function confirmButtonData(orderId: string): string {
  return `confirm:${orderId}`;
}

/** What the "Confirmed" button carries once an order is confirmed: pressing it again only says so. */
export const CONFIRMED_BUTTON_DATA = "confirmed";

export function parseButtonData(data: string): { action: "confirm"; orderId: string } | null {
  const match = /^confirm:([0-9a-f-]{36})$/.exec(data);
  return match ? { action: "confirm", orderId: match[1]! } : null;
}
