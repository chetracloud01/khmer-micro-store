import type { SystemDb } from "@khmer-micro-store/db";
import { ALERT_BUTTONS, buyerCancelledAlert, confirmButtonData, newOrderAlert } from "@khmer-micro-store/shared";
import type { Logger } from "pino";
import type { InlineButton, TelegramClient } from "../telegram/client";

// Sends the messages the API wrote to outbox_events, in the same transaction
// as the change they report (docs/blueprint.md "Database schema", Platform).
// A message is leased before sending, so two workers never send it twice; a
// failed send is tried again later, waiting longer each time.

/** Messages handled per round. */
const BATCH = 20;
/** After this many failed tries a message is left alone (and stays visible in the table for the admin). */
export const MAX_ATTEMPTS = 8;
/** How long a leased message waits before another worker may try it, if this one stops mid-send. */
const LEASE_MS = 2 * 60_000;

/** 10 s, 20 s, 40 s … up to an hour. */
export function retryDelayMs(attempts: number): number {
  return Math.min(60 * 60_000, 10_000 * 2 ** Math.max(0, attempts - 1));
}

export interface OutboxDeps {
  db: SystemDb;
  telegram: TelegramClient;
  logger: Logger;
  /** The web app's address, for the "Open" button. */
  webOrigin: string;
}

interface Message {
  text: string;
  buttons?: InlineButton[][];
}

/** One round: takes the waiting messages, sends each to every member of its shop who logs in with Telegram. Returns how many were handled. */
export async function deliverOutboxOnce(deps: OutboxDeps): Promise<number> {
  const { db, logger } = deps;
  // Lease: mark the batch as taken for a while, in one short statement, before any network call.
  const leased = await db.$queryRaw<{ id: string; store_id: string | null; kind: string; payload: { orderId?: string }; attempts: number }[]>`
    UPDATE outbox_events SET available_at = now() + ${`${LEASE_MS} milliseconds`}::interval
    WHERE id IN (
      SELECT id FROM outbox_events
      WHERE sent_at IS NULL AND available_at <= now() AND attempts < ${MAX_ATTEMPTS}
      ORDER BY created_at
      LIMIT ${BATCH}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, store_id, kind, payload, attempts`;

  for (const event of leased) {
    try {
      const message = await buildMessage(deps, event.kind, event.payload);
      const chats = event.store_id ? await telegramChatsOf(db, event.store_id) : [];
      for (const chat of chats) await deps.telegram.sendMessage(chat, message.text, message.buttons);
      await db.outboxEvent.update({ where: { id: event.id }, data: { sentAt: new Date(), lastError: chats.length === 0 ? "no Telegram chat for this shop" : "" } });
    } catch (error) {
      const attempts = event.attempts + 1;
      const reason = error instanceof Error ? error.message.slice(0, 300) : "unknown error";
      await db.outboxEvent.update({ where: { id: event.id }, data: { attempts, lastError: reason, availableAt: new Date(Date.now() + retryDelayMs(attempts)) } });
      logger.warn({ eventId: event.id, kind: event.kind, attempts, reason }, "outbox message not sent, will retry");
    }
  }
  return leased.length;
}

/** The Telegram chats of a shop's people: a member who logs in with Telegram has a private chat with the bot. */
export async function telegramChatsOf(db: SystemDb, storeId: string): Promise<string[]> {
  const identities = await db.merchantIdentity.findMany({
    where: { method: "telegram", merchant: { memberships: { some: { storeId } } } },
    select: { providerUserId: true },
  });
  return identities.map((identity) => identity.providerUserId);
}

async function buildMessage(deps: OutboxDeps, kind: string, payload: { orderId?: string }): Promise<Message> {
  const order = payload.orderId
    ? await deps.db.order.findUnique({
        where: { id: payload.orderId },
        select: { id: true, orderNumber: true, status: true, totalMinor: true, currency: true, paymentMethod: true, fulfilment: true, districtId: true, provinceId: true, items: { select: { quantity: true } } },
      })
    : null;
  if (!order) throw new Error(`order for ${kind} not found`);
  const openUrl = `${deps.webOrigin}/km/m/orders/${order.id}`;
  if (kind === "order_placed") {
    const text = newOrderAlert({ ...order, itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0) });
    // "Confirm" only while the order still waits for it (it may have been confirmed in the dashboard meanwhile).
    const canConfirm = order.status === "cod_pending" || order.status === "paid";
    return {
      text,
      buttons: [[...(canConfirm ? [{ text: ALERT_BUTTONS.confirm, callbackData: confirmButtonData(order.id) }] : []), { text: ALERT_BUTTONS.open, url: openUrl }]],
    };
  }
  if (kind === "order_cancelled_by_buyer") return { text: buyerCancelledAlert(order), buttons: [[{ text: ALERT_BUTTONS.open, url: openUrl }]] };
  throw new Error(`unknown message kind ${kind}`);
}
