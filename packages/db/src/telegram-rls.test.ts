import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAppDb, createSystemDb, withContext, withPublicOrder, withPublicStore, type AppDb, type SystemDb } from "./index";

// Release 1's checks on the real database: Telegram link codes can be
// written by the API but never read; a seller makes group codes only for
// their own shop and a buyer follow codes only for the order whose link they
// hold; staff groups stay per shop; a paused shop reports itself closed.

const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DATABASE_OWNER_URL;

describe.skipIf(!appUrl || !ownerUrl)("Telegram links and closed shops", () => {
  let app: AppDb;
  let system: SystemDb;
  const run = randomUUID().slice(0, 8);
  const merchantA = randomUUID();
  const merchantB = randomUUID();
  const storeA = randomUUID();
  const storeB = randomUUID();
  const slugA = `tg-rls-${run}-a`;
  const slugB = `tg-rls-${run}-b`;
  const tokenA = randomBytes(24).toString("base64url");
  let orderA = "";
  let orderB = "";
  const code = () => ({ codeHash: randomBytes(16).toString("hex"), expiresAt: new Date(Date.now() + 60_000) });

  async function seed(merchantId: string, storeId: string, slug: string, token: string) {
    await system.merchant.create({ data: { id: merchantId, firstName: slug } });
    await system.store.create({ data: { id: storeId, slug, name: slug, businessType: "shop", members: { create: { merchantId, role: "owner" } }, subscription: { create: { plan: "free", status: "trialing" } } } });
    const customer = await system.customer.create({ data: { storeId, phone: "855971234567", name: "Sokha" } });
    const order = await system.order.create({
      data: {
        storeId,
        customerId: customer.id,
        orderNumber: 1,
        publicToken: token,
        status: "cod_pending",
        paymentMethod: "cod",
        currency: "USD",
        subtotalMinor: 100,
        discountMinor: 0,
        deliveryFeeMinor: 0,
        vatPercent: 0,
        vatMinor: 0,
        totalMinor: 100,
        exchangeRateUsed: 4100,
        fulfilment: "pickup",
        area: "phnom_penh",
        buyerName: "Sokha",
        buyerPhone: "855971234567",
        idempotencyKey: randomUUID(),
      },
    });
    return order.id;
  }

  beforeAll(async () => {
    app = createAppDb(appUrl as string);
    system = createSystemDb(ownerUrl as string);
    orderA = await seed(merchantA, storeA, slugA, tokenA);
    orderB = await seed(merchantB, storeB, slugB, randomBytes(24).toString("base64url"));
    await system.storeAlertChat.create({ data: { storeId: storeB, chatId: "-1001", title: "B staff" } });
    await system.orderFollower.create({ data: { storeId: storeA, orderId: orderA, chatId: "777" } });
  });

  afterAll(async () => {
    await system?.telegramLinkCode.deleteMany({ where: { storeId: { in: [storeA, storeB] } } });
    await system?.order.deleteMany({ where: { storeId: { in: [storeA, storeB] } } });
    await system?.store.deleteMany({ where: { id: { in: [storeA, storeB] } } });
    await system?.merchant.deleteMany({ where: { id: { in: [merchantA, merchantB] } } });
    await app?.$disconnect();
    await system?.$disconnect();
  });

  it("lets a seller write a group code for their own shop — and never read codes back", async () => {
    const asA = (work: Parameters<typeof withContext>[2]) => withContext(app, { merchantId: merchantA, storeId: storeA }, work);
    await expect(asA((tx) => tx.telegramLinkCode.createMany({ data: [{ kind: "group_link", storeId: storeA, ...code() }] }))).resolves.toEqual({ count: 1 });
    await expect(asA((tx) => tx.telegramLinkCode.createMany({ data: [{ kind: "group_link", storeId: storeB, ...code() }] }))).rejects.toThrow();
    await expect(asA((tx) => tx.telegramLinkCode.createMany({ data: [{ kind: "order_follow", storeId: storeA, orderId: orderA, ...code() }] }))).rejects.toThrow();
    await expect(asA((tx) => tx.telegramLinkCode.findMany())).rejects.toThrow(/permission denied/i);
  });

  it("lets a buyer write a follow code only for the order whose link they hold", async () => {
    await expect(
      withPublicOrder(app, tokenA, (tx, storeId) => tx.telegramLinkCode.createMany({ data: [{ kind: "order_follow", storeId, orderId: orderA, ...code() }] })),
    ).resolves.toEqual({ count: 1 });
    await expect(
      withPublicOrder(app, tokenA, (tx, storeId) => tx.telegramLinkCode.createMany({ data: [{ kind: "order_follow", storeId, orderId: orderB, ...code() }] })),
    ).rejects.toThrow();
    await expect(withPublicStore(app, slugA, (tx, storeId) => tx.telegramLinkCode.createMany({ data: [{ kind: "group_link", storeId, ...code() }] }))).rejects.toThrow();
  });

  it("shows an order page whether its own order is followed — and nothing about other orders", async () => {
    expect(await withPublicOrder(app, tokenA, (tx) => tx.orderFollower.count())).toBe(1);
    await expect(withPublicOrder(app, tokenA, (tx) => tx.orderFollower.createMany({ data: [{ storeId: storeA, orderId: orderA, chatId: "888" }] }))).rejects.toThrow();
  });

  it("keeps each shop's staff groups its own", async () => {
    expect(await withContext(app, { merchantId: merchantA, storeId: storeA }, (tx) => tx.storeAlertChat.count())).toBe(0);
    expect(await withContext(app, { merchantId: merchantB, storeId: storeB }, (tx) => tx.storeAlertChat.count())).toBe(1);
    expect(await withContext(app, { merchantId: merchantA, storeId: storeA }, (tx) => tx.storeAlertChat.deleteMany({ where: { storeId: storeB } }))).toEqual({ count: 0 });
  });

  it("reports a paused shop closed to buyers, an open one open", async () => {
    const isOpen = (slug: string) => withPublicStore(app, slug, async (tx) => (await tx.$queryRaw<{ open: boolean }[]>`SELECT app_public_store_open() AS open`)[0]?.open);
    expect(await isOpen(slugA)).toBe(true);
    await system.subscription.update({ where: { storeId: storeA }, data: { status: "paused" } });
    expect(await isOpen(slugA)).toBe(false);
    expect(await isOpen(slugB)).toBe(true);
  });
});
