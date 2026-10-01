import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAppDb, createSystemDb, withContext, withPublicOrder, withPublicStore, type AppDb, type SystemDb, type Tx } from "./index";

// Step 6's checks on the real database: a buyer cancels only their own order,
// only while that's allowed; the buyer may queue only a "new order" message
// for the shop they ordered from; each shop's dispatches and messages stay
// its own, and only the worker marks a message sent.

const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DATABASE_OWNER_URL;

describe.skipIf(!appUrl || !ownerUrl)("dispatch, outbox and buyer-cancel security", () => {
  let app: AppDb;
  let system: SystemDb;
  const run = randomUUID().slice(0, 8);
  const merchantA = randomUUID();
  const merchantB = randomUUID();
  const storeA = randomUUID();
  const storeB = randomUUID();
  const slugA = `dsp-test-${run}-a`;
  const slugB = `dsp-test-${run}-b`;
  let number = 0;

  async function seedStore(merchantId: string, storeId: string, slug: string) {
    await system.merchant.create({ data: { id: merchantId, firstName: slug } });
    await system.store.create({ data: { id: storeId, slug, name: slug, businessType: "shop", members: { create: { merchantId, role: "owner" } } } });
  }

  async function seedOrder(storeId: string, status: "cod_pending" | "packing" | "confirmed", paymentMethod: "cod" | "khqr" = "cod") {
    number += 1;
    const token = randomBytes(24).toString("base64url");
    const customer = await system.customer.upsert({
      where: { storeId_phone: { storeId, phone: "855971234567" } },
      create: { storeId, phone: "855971234567", name: "Sokha" },
      update: {},
    });
    const order = await system.order.create({
      data: {
        storeId,
        customerId: customer.id,
        orderNumber: number,
        publicToken: token,
        status,
        paymentMethod,
        currency: "USD",
        subtotalMinor: 100,
        discountMinor: 0,
        deliveryFeeMinor: 0,
        vatPercent: 0,
        vatMinor: 0,
        totalMinor: 100,
        exchangeRateUsed: 4100,
        fulfilment: "delivery",
        area: "phnom_penh",
        buyerName: "Sokha",
        buyerPhone: "855971234567",
        idempotencyKey: randomUUID(),
      },
    });
    return { id: order.id, token };
  }

  const cancelAs = (token: string, expected: string) =>
    withPublicOrder(app, token, async (tx: Tx) => (await tx.$queryRaw<{ ok: boolean }[]>`SELECT app_buyer_cancel_order(${expected}::"OrderStatus") AS ok`)[0]?.ok);

  beforeAll(async () => {
    app = createAppDb(appUrl as string);
    system = createSystemDb(ownerUrl as string);
    await seedStore(merchantA, storeA, slugA);
    await seedStore(merchantB, storeB, slugB);
  });

  afterAll(async () => {
    await system?.outboxEvent.deleteMany({ where: { storeId: { in: [storeA, storeB] } } });
    await system?.order.deleteMany({ where: { storeId: { in: [storeA, storeB] } } });
    await system?.store.deleteMany({ where: { id: { in: [storeA, storeB] } } });
    await system?.merchant.deleteMany({ where: { id: { in: [merchantA, merchantB] } } });
    await app?.$disconnect();
    await system?.$disconnect();
  });

  it("lets a buyer cancel their own new cash order once, recording it and telling the seller", async () => {
    const order = await seedOrder(storeA, "cod_pending");
    expect(await cancelAs(order.token, "cod_pending")).toBe(true);
    const saved = await system.order.findUniqueOrThrow({ where: { id: order.id }, include: { events: true } });
    expect(saved.status).toBe("cancelled");
    expect(saved.cancelReason).toBe("buyer_cancelled");
    expect(saved.events.map((event) => [event.status, event.actor])).toEqual([["cancelled", "buyer"]]);
    expect(await system.outboxEvent.count({ where: { storeId: storeA, kind: "order_cancelled_by_buyer" } })).toBe(1);
    // A second tap changes nothing.
    expect(await cancelAs(order.token, "cod_pending")).toBe(false);
  });

  it("refuses once the order is packed, or paid online and confirmed — and from a status the buyer didn't see", async () => {
    const packed = await seedOrder(storeA, "packing");
    expect(await cancelAs(packed.token, "packing")).toBe(false);
    const paidConfirmed = await seedOrder(storeA, "confirmed", "khqr");
    expect(await cancelAs(paidConfirmed.token, "confirmed")).toBe(false);
    const fresh = await seedOrder(storeA, "cod_pending");
    expect(await cancelAs(fresh.token, "confirmed")).toBe(false);
    const statuses = await system.order.findMany({ where: { id: { in: [packed.id, paidConfirmed.id, fresh.id] } }, select: { status: true } });
    expect(statuses.map((order) => order.status).sort()).toEqual(["cod_pending", "confirmed", "packing"]);
  });

  it("cancels only the order whose link the buyer holds", async () => {
    const mine = await seedOrder(storeA, "cod_pending");
    const theirs = await seedOrder(storeA, "cod_pending");
    expect(await cancelAs(mine.token, "cod_pending")).toBe(true);
    expect((await system.order.findUniqueOrThrow({ where: { id: theirs.id } })).status).toBe("cod_pending");
  });

  it("lets a buyer queue only a new-order message, only for the shop they're in", async () => {
    // createMany, as the API does: a buyer may add a message but not read it back.
    await expect(withPublicStore(app, slugA, (tx, storeId) => tx.outboxEvent.createMany({ data: [{ storeId, kind: "order_placed", payload: {} }] }))).resolves.toEqual({ count: 1 });
    await expect(withPublicStore(app, slugA, (tx, storeId) => tx.outboxEvent.createMany({ data: [{ storeId, kind: "order_cancelled_by_buyer", payload: {} }] }))).rejects.toThrow();
    await expect(withPublicStore(app, slugA, (tx) => tx.outboxEvent.createMany({ data: [{ storeId: storeB, kind: "order_placed", payload: {} }] }))).rejects.toThrow();
    // And can't read the queue.
    expect(await withPublicStore(app, slugA, (tx) => tx.outboxEvent.count())).toBe(0);
  });

  it("keeps each shop's dispatches its own, shows a buyer only their order's, and never lets the API mark a message sent", async () => {
    const order = await seedOrder(storeA, "packing");
    await withContext(app, { merchantId: merchantA, storeId: storeA }, (tx) =>
      tx.deliveryDispatch.create({ data: { storeId: storeA, orderId: order.id, route: "driver", driverName: "Dara", driverPhone: "85512345678" } }),
    );
    const fromB = await withContext(app, { merchantId: merchantB, storeId: storeB }, (tx) => tx.deliveryDispatch.count({ where: { orderId: order.id } }));
    expect(fromB).toBe(0);
    expect(await withPublicOrder(app, order.token, (tx) => tx.deliveryDispatch.count())).toBe(1);
    const other = await seedOrder(storeA, "cod_pending");
    expect(await withPublicOrder(app, other.token, (tx) => tx.deliveryDispatch.count())).toBe(0);
    // A driver dispatch without the driver's details is refused by the database itself.
    await expect(
      withContext(app, { merchantId: merchantA, storeId: storeA }, (tx) => tx.deliveryDispatch.create({ data: { storeId: storeA, orderId: order.id, route: "driver" } })),
    ).rejects.toThrow();
    await expect(
      withContext(app, { merchantId: merchantA, storeId: storeA }, (tx) => tx.outboxEvent.updateMany({ where: { storeId: storeA }, data: { sentAt: new Date() } })),
    ).rejects.toThrow();
  });
});
