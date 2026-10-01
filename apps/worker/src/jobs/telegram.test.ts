import { randomBytes, randomUUID } from "node:crypto";
import { createSystemDb, type SystemDb } from "@khmer-micro-store/db";
import { confirmButtonData } from "@khmer-micro-store/shared";
import pino from "pino";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { InlineButton, TelegramClient } from "../telegram/client";
import { deliverOutboxOnce, MAX_ATTEMPTS, retryDelayMs } from "./outbox";
import { handleButton } from "./telegram-buttons";

// Step 6's Telegram alerts on the real database, with a pretend Telegram:
// a new order reaches the shop's people, a failed send is retried later, and
// only a member of the order's shop can confirm it from a button.

const ownerUrl = process.env.DATABASE_OWNER_URL;

class FakeTelegram implements TelegramClient {
  readonly dryRun = false;
  sent: { chatId: string; text: string; buttons?: InlineButton[][] }[] = [];
  failing = false;
  async sendMessage(chatId: string, text: string, buttons?: InlineButton[][]) {
    if (this.failing) throw new Error("telegram down");
    this.sent.push({ chatId, text, buttons });
  }
  async getCallbackQueries(offset: number) {
    return { queries: [], nextOffset: offset };
  }
  async answerCallback() {}
  async editButtons() {}
}

describe("retryDelayMs", () => {
  it("waits longer after each failure, never more than an hour", () => {
    expect(retryDelayMs(1)).toBe(10_000);
    expect(retryDelayMs(3)).toBe(40_000);
    expect(retryDelayMs(30)).toBe(60 * 60_000);
  });
});

describe.skipIf(!ownerUrl)("Telegram alerts and buttons", () => {
  let db: SystemDb;
  const logger = pino({ level: "silent" });
  const run = randomUUID().slice(0, 8);
  const owner = randomUUID();
  const stranger = randomUUID();
  const storeId = randomUUID();
  const ownerTelegramId = `9${Date.now()}`.slice(0, 12);
  const strangerTelegramId = `8${Date.now()}`.slice(0, 12);
  let orderId = "";

  async function newOrder(status: "cod_pending" | "confirmed" = "cod_pending") {
    const customer = await db.customer.upsert({
      where: { storeId_phone: { storeId, phone: "855971234567" } },
      create: { storeId, phone: "855971234567", name: "Sokha" },
      update: {},
    });
    const count = await db.order.count({ where: { storeId } });
    const order = await db.order.create({
      data: {
        storeId,
        customerId: customer.id,
        orderNumber: count + 1,
        publicToken: randomBytes(24).toString("base64url"),
        status,
        paymentMethod: "cod",
        currency: "KHR",
        subtotalMinor: 46800,
        discountMinor: 0,
        deliveryFeeMinor: 4000,
        vatPercent: 0,
        vatMinor: 0,
        totalMinor: 50800,
        exchangeRateUsed: 4100,
        fulfilment: "delivery",
        area: "phnom_penh",
        districtId: "daun-penh",
        buyerName: "Sokha",
        buyerPhone: "855971234567",
        idempotencyKey: randomUUID(),
        items: { create: [{ storeId, variantId: randomUUID(), titleKm: "x", titleEn: "x", unitPriceMinor: 23400, quantity: 2, lineTotalMinor: 46800 }] },
      },
    });
    return order.id;
  }

  beforeAll(async () => {
    db = createSystemDb(ownerUrl as string);
    await db.merchant.create({ data: { id: owner, firstName: "Owner", identities: { create: { method: "telegram", providerUserId: ownerTelegramId } } } });
    await db.merchant.create({ data: { id: stranger, firstName: "Stranger", identities: { create: { method: "telegram", providerUserId: strangerTelegramId } } } });
    await db.store.create({ data: { id: storeId, slug: `tg-test-${run}`, name: "TG test", businessType: "shop", members: { create: { merchantId: owner, role: "owner" } } } });
    orderId = await newOrder();
  });

  afterAll(async () => {
    await db?.outboxEvent.deleteMany({ where: { storeId } });
    await db?.order.deleteMany({ where: { storeId } });
    await db?.store.deleteMany({ where: { id: storeId } });
    await db?.merchant.deleteMany({ where: { id: { in: [owner, stranger] } } });
    await db?.$disconnect();
  });

  it("sends a new-order alert to the shop's member, with Confirm and Open buttons, and marks it sent", async () => {
    const event = await db.outboxEvent.create({ data: { storeId, kind: "order_placed", payload: { orderId } } });
    const telegram = new FakeTelegram();
    await deliverOutboxOnce({ db, telegram, logger, webOrigin: "https://shop.example" });
    const mine = telegram.sent.filter((message) => message.text.includes("50,800៛"));
    expect(mine).toHaveLength(1);
    expect(mine[0]?.chatId).toBe(ownerTelegramId);
    expect(mine[0]?.text).not.toContain("971234567");
    const buttons = mine[0]?.buttons?.flat() ?? [];
    expect(buttons.some((button) => "callbackData" in button && button.callbackData === confirmButtonData(orderId))).toBe(true);
    expect(buttons.some((button) => "url" in button && button.url === `https://shop.example/km/m/orders/${orderId}`)).toBe(true);
    expect((await db.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).sentAt).not.toBeNull();
  });

  it("keeps a message when Telegram fails, and tries again later", async () => {
    const event = await db.outboxEvent.create({ data: { storeId, kind: "order_placed", payload: { orderId } } });
    const telegram = new FakeTelegram();
    telegram.failing = true;
    await deliverOutboxOnce({ db, telegram, logger, webOrigin: "https://shop.example" });
    const after = await db.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(after.sentAt).toBeNull();
    expect(after.attempts).toBe(1);
    expect(after.lastError).toContain("telegram down");
    expect(after.availableAt.getTime()).toBeGreaterThan(Date.now());
    // Not picked up again before its time.
    telegram.failing = false;
    await deliverOutboxOnce({ db, telegram, logger, webOrigin: "https://shop.example" });
    expect((await db.outboxEvent.findUniqueOrThrow({ where: { id: event.id } })).sentAt).toBeNull();
    expect(MAX_ATTEMPTS).toBeGreaterThan(1);
  });

  it("lets only a member of the order's shop confirm it from Telegram", async () => {
    expect(await handleButton(db, { fromUserId: strangerTelegramId, data: confirmButtonData(orderId) })).toBe("not_member");
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).status).toBe("cod_pending");
    expect(await handleButton(db, { fromUserId: "123", data: confirmButtonData(orderId) })).toBe("not_member");
    expect(await handleButton(db, { fromUserId: ownerTelegramId, data: "delete:everything" })).toBe("unknown_button");

    expect(await handleButton(db, { fromUserId: ownerTelegramId, data: confirmButtonData(orderId) })).toBe("confirmed");
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { events: true } });
    expect(order.status).toBe("confirmed");
    expect(order.events.find((event) => event.status === "confirmed")?.actorMerchantId).toBe(owner);
    // A second press, or one after the dashboard moved it on, changes nothing.
    expect(await handleButton(db, { fromUserId: ownerTelegramId, data: confirmButtonData(orderId) })).toBe("already_moved");
  });

  it("refuses a button in a paused shop", async () => {
    const another = await newOrder();
    await db.subscription.create({ data: { storeId, plan: "free", status: "paused" } });
    expect(await handleButton(db, { fromUserId: ownerTelegramId, data: confirmButtonData(another) })).toBe("store_paused");
    expect((await db.order.findUniqueOrThrow({ where: { id: another } })).status).toBe("cod_pending");
    await db.subscription.delete({ where: { storeId } });
  });
});
