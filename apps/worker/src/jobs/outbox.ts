import type { SystemDb } from "@khmer-micro-store/db";
import { ALERT_BUTTONS, buyerCancelledAlert, confirmButtonData, newOrderAlert } from "@khmer-micro-store/shared";
import type { Logger } from "pino";
import { TelegramError, type InlineButton, type TelegramClient } from "../telegram/client";

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
      // Each person separately: one chat that can't be reached must not hold back — or repeat — everyone else's message.
      let delivered = 0;
      let lastFailure: unknown = null;
      let retryable = false;
      for (const chat of chats) {
        try {
          await deps.telegram.sendMessage(chat, message.text, message.buttons);
          delivered += 1;
        } catch (error) {
          lastFailure = error;
          if (!isPermanentRefusal(error)) retryable = true;
        }
      }
      // Try again later only if nobody got it and the reason may pass (Telegram down, rate limit).
      if (delivered === 0 && retryable) throw lastFailure;
      const note = chats.length === 0 ? "no Telegram chat for this shop" : lastFailure instanceof Error ? `not delivered to every chat: ${lastFailure.message.slice(0, 200)}` : "";
      await db.outboxEvent.update({ where: { id: event.id }, data: { sentAt: new Date(), lastError: note } });
    } catch (error) {
      const attempts = event.attempts + 1;
      const reason = error instanceof Error ? error.message.slice(0, 300) : "unknown error";
      await db.outboxEvent.update({ where: { id: event.id }, data: { attempts, lastError: reason, availableAt: new Date(Date.now() + retryDelayMs(attempts)) } });
      logger.warn({ eventId: event.id, kind: event.kind, attempts, reason }, "outbox message not sent, will retry");
    }
  }
  return leased.length;
}

/** A public https address Telegram will open from a button — not localhost or a private network address. */
export function linksFromTelegram(webOrigin: string): boolean {
  try {
    const { protocol, hostname } = new URL(webOrigin);
    if (protocol !== "https:") return false;
    return !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/.test(hostname);
  } catch {
    return false;
  }
}

/**
 * Telegram said no for good: the chat doesn't exist, or the person blocked
 * the bot or never pressed Start (400/403). Trying again won't change that.
 */
export function isPermanentRefusal(error: unknown): boolean {
  return error instanceof TelegramError && (error.status === 400 || error.status === 403);
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
  // Telegram refuses a button that links to a private address (localhost on a developer's PC): leave "Open" out there.
  const open = linksFromTelegram(deps.webOrigin) ? [{ text: ALERT_BUTTONS.open, url: `${deps.webOrigin}/km/m/orders/${order.id}` }] : [];
  if (kind === "order_placed") {
    const text = newOrderAlert({ ...order, itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0) });
    // "Confirm" only while the order still waits for it (it may have been confirmed in the dashboard meanwhile).
    const canConfirm = order.status === "cod_pending" || order.status === "paid";
    return {
      text,
      buttons: [[...(canConfirm ? [{ text: ALERT_BUTTONS.confirm, callbackData: confirmButtonData(order.id) }] : []), ...open]],
    };
  }
  if (kind === "order_cancelled_by_buyer") return { text: buyerCancelledAlert(order), buttons: open.length ? [open] : undefined };
  throw new Error(`unknown message kind ${kind}`);
}
