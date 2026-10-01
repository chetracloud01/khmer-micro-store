import type { SystemDb } from "@khmer-micro-store/db";
import { ALERT_BUTTONS, decideOrderAction, parseButtonData } from "@khmer-micro-store/shared";
import type { Logger } from "pino";
import type { CallbackQuery, TelegramClient } from "../telegram/client";

// "Confirm" pressed under a new-order alert. The worker sees every shop, so it
// checks itself what row-level security checks for the API: the person who
// pressed must log in with this Telegram account and belong to the order's
// shop. The step itself goes through packages/shared decideOrderAction, like
// the dashboard's button.

export type ButtonOutcome = "confirmed" | "already_moved" | "not_member" | "unknown_button" | "store_paused";

export async function handleButton(db: SystemDb, query: Pick<CallbackQuery, "fromUserId" | "data">): Promise<ButtonOutcome> {
  const button = parseButtonData(query.data);
  if (!button) return "unknown_button";

  const order = await db.order.findUnique({
    where: { id: button.orderId },
    select: { id: true, storeId: true, status: true, paymentMethod: true, fulfilment: true, area: true },
  });
  const identity = await db.merchantIdentity.findUnique({
    where: { method_providerUserId: { method: "telegram", providerUserId: query.fromUserId } },
    select: { merchantId: true },
  });
  if (!order || !identity) return "not_member";
  const member = await db.storeMember.findFirst({ where: { storeId: order.storeId, merchantId: identity.merchantId }, select: { id: true } });
  if (!member) return "not_member";

  // A paused shop is read-only, from Telegram as from the dashboard.
  const subscription = await db.subscription.findUnique({ where: { storeId: order.storeId }, select: { status: true } });
  if (subscription?.status === "paused") return "store_paused";

  const decision = decideOrderAction(order, { action: "confirm" });
  if ("refused" in decision) return "already_moved";
  return db.$transaction(async (tx) => {
    const { count } = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: decision.status } });
    if (count === 0) return "already_moved";
    await tx.orderStatusEvent.create({ data: { storeId: order.storeId, orderId: order.id, status: decision.status, actor: "merchant", actorMerchantId: identity.merchantId } });
    await tx.auditLog.create({
      data: {
        actorType: "merchant",
        actorId: identity.merchantId,
        storeId: order.storeId,
        action: "order.confirm",
        entity: "order",
        entityId: order.id,
        before: { status: order.status },
        after: { status: decision.status, via: "telegram" },
      },
    });
    return "confirmed" as const;
  });
}

const ANSWER: Record<ButtonOutcome, string> = {
  confirmed: "✅ បានបញ្ជាក់ · Confirmed",
  already_moved: "ការបញ្ជាទិញនេះបានផ្លាស់ប្តូររួចហើយ · This order has already moved on",
  not_member: "អ្នកមិនមែនជាសមាជិកហាងនេះទេ · You're not a member of this shop",
  unknown_button: "ប៊ូតុងនេះលែងប្រើបានហើយ · This button no longer works",
  store_paused: "ហាងត្រូវបានផ្អាក · The shop is paused",
};

/** Long polling for button presses (development and beta; a webhook replaces it in production). Runs until `stopped()` says so. */
export async function pollButtons(deps: { db: SystemDb; telegram: TelegramClient; logger: Logger; stopped: () => boolean }): Promise<void> {
  let offset = 0;
  while (!deps.stopped()) {
    try {
      const { queries, nextOffset } = await deps.telegram.getCallbackQueries(offset, 25);
      offset = nextOffset;
      for (const query of queries) {
        const outcome = await handleButton(deps.db, query);
        await deps.telegram.answerCallback(query.id, ANSWER[outcome]);
        if (outcome === "confirmed" && query.chatId && query.messageId !== null) {
          await deps.telegram.editButtons(query.chatId, query.messageId, [[{ text: ALERT_BUTTONS.confirmed, callbackData: "noop" }]]);
        }
        deps.logger.info({ outcome }, "telegram button");
      }
    } catch (error) {
      deps.logger.warn({ reason: error instanceof Error ? error.message : "unknown" }, "telegram polling failed, retrying");
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
  }
}
