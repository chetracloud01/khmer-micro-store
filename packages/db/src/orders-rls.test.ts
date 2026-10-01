import { randomBytes, randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asOrderBuyer, createAppDb, createSystemDb, withContext, withPublicOrder, withPublicStore, type AppDb, type SystemDb, type Tx } from "./index";

// Step 4's checks on the real database: a buyer (no login) can add one order
// to the shop they're looking at and read it back by its link — nothing else:
// not the customer list, not another order, not the drivers, nothing of
// another shop. Each shop's orders, customers and delivery stay its own.

const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DATABASE_OWNER_URL;

describe.skipIf(!appUrl || !ownerUrl)("orders row-level security", () => {
  let app: AppDb;
  let system: SystemDb;
  const run = randomUUID().slice(0, 8);
  const merchantA = randomUUID();
  const merchantB = randomUUID();
  const storeA = randomUUID();
  const storeB = randomUUID();
  const slugA = `ord-test-${run}-a`;
  const slugB = `ord-test-${run}-b`;
  const variantA = randomUUID();
  const newToken = () => randomBytes(24).toString("base64url");

  async function seedStore(merchantId: string, storeId: string, slug: string, variantId: string) {
    await system.merchant.create({ data: { id: merchantId, firstName: slug } });
    const categoryId = randomUUID();
    await system.store.create({
      data: {
        id: storeId,
        slug,
        name: `Shop ${slug}`,
        businessType: "shop",
        members: { create: { merchantId, role: "owner" } },
        categories: { create: { id: categoryId, nameKm: "ប្រភេទ", nameEn: "Category" } },
        drivers: { create: { name: "Dara", phone: "85512345678", kind: "own" } },
        deliveryZones: { create: { name: "Central", feeUsdCents: 150, districts: { create: { storeId, districtId: "doun_penh" } } } },
      },
    });
    await system.product.create({
      data: {
        storeId,
        categoryId,
        titleKm: "កាហ្វេ",
        titleEn: "Coffee",
        variants: { create: { id: variantId, storeId, sku: `SKU-${variantId.slice(0, 8)}`, isDefault: true, priceUsdCents: 125 } },
      },
    });
  }

  /** What the API does to place an order, as the buyer of `storeId`. */
  async function placeOrder(tx: Tx, storeId: string, token: string, key = randomUUID(), phone = "85597123456") {
    await asOrderBuyer(tx, token);
    const [customer] = await tx.$queryRaw<{ id: string }[]>`SELECT app_save_customer(${phone}, ${"Sokha"}, 'phnom_penh'::"DeliveryArea", ${"doun_penh"}, ${null}, ${""}) AS id`;
    const [number] = await tx.$queryRaw<{ n: number }[]>`SELECT app_next_order_number() AS n`;
    const order = await tx.order.create({
      data: {
        storeId,
        customerId: customer!.id,
        orderNumber: number!.n,
        publicToken: token,
        status: "cod_pending",
        paymentMethod: "cod",
        currency: "USD",
        subtotalMinor: 250,
        discountMinor: 0,
        deliveryFeeMinor: 150,
        vatPercent: 0,
        vatMinor: 0,
        totalMinor: 400,
        exchangeRateUsed: 4100,
        fulfilment: "delivery",
        area: "phnom_penh",
        districtId: "doun_penh",
        buyerName: "Sokha",
        buyerPhone: phone,
        idempotencyKey: key,
      },
    });
    await tx.orderItem.createMany({
      data: [{ storeId, orderId: order.id, variantId: variantA, titleKm: "កាហ្វេ", titleEn: "Coffee", unitPriceMinor: 125, quantity: 2, lineTotalMinor: 250 }],
    });
    await tx.orderStatusEvent.createMany({ data: [{ storeId, orderId: order.id, status: "cod_pending", actor: "buyer" }] });
    return order;
  }

  let firstToken = "";
  let firstOrderId = "";
  const firstKey = randomUUID();

  beforeAll(async () => {
    app = createAppDb(appUrl as string);
    system = createSystemDb(ownerUrl as string);
    await seedStore(merchantA, storeA, slugA, variantA);
    await seedStore(merchantB, storeB, slugB, randomUUID());
  });

  afterAll(async () => {
    // Test rows only: orders first (customers can't go while an order points at them).
    await system?.order.deleteMany({ where: { storeId: { in: [storeA, storeB] } } });
    await system?.store.deleteMany({ where: { id: { in: [storeA, storeB] } } });
    await system?.merchant.deleteMany({ where: { id: { in: [merchantA, merchantB] } } });
    await app?.$disconnect();
    await system?.$disconnect();
  });

  it("lets a buyer place an order in the shop they're looking at, numbered from 1", async () => {
    firstToken = newToken();
    const order = await withPublicStore(app, slugA, (tx, storeId) => placeOrder(tx, storeId, firstToken, firstKey));
    expect(order?.orderNumber).toBe(1);
    firstOrderId = order!.id;
    const second = await withPublicStore(app, slugA, (tx, storeId) => placeOrder(tx, storeId, newToken()));
    expect(second?.orderNumber).toBe(2);
    // Another shop counts from 1 on its own.
    const other = await withPublicStore(app, slugB, (tx, storeId) => placeOrder(tx, storeId, newToken()));
    expect(other?.orderNumber).toBe(1);
  });

  it("lets the buyer read back their order by its link — lines and history included", async () => {
    const seen = await withPublicOrder(app, firstToken, async (tx, storeId) => ({
      storeId,
      order: await tx.order.findFirst({ include: { items: true, events: true } }),
      store: await tx.store.findUnique({ where: { id: storeId }, select: { name: true } }),
    }));
    expect(seen?.storeId).toBe(storeA);
    expect(seen?.order?.id).toBe(firstOrderId);
    expect(seen?.order?.items).toHaveLength(1);
    expect(seen?.order?.events.map((event) => event.status)).toEqual(["cod_pending"]);
    expect(seen?.store?.name).toBe(`Shop ${slugA}`);
  });

  it("shows an order link only its own order, never another one or the customer list", async () => {
    const seen = await withPublicOrder(app, firstToken, async (tx) => ({
      orders: await tx.order.count(),
      items: await tx.orderItem.count(),
      customers: await tx.customer.count(),
      drivers: await tx.storeDriver.count(),
    }));
    expect(seen).toEqual({ orders: 1, items: 1, customers: 0, drivers: 0 });
    expect(await withPublicOrder(app, newToken(), async () => "found")).toBeNull();
  });

  it("gives the shop page the delivery zones, but not the drivers, customers or orders", async () => {
    const seen = await withPublicStore(app, slugA, async (tx) => ({
      zones: await tx.deliveryZone.findMany({ include: { districts: true } }),
      drivers: await tx.storeDriver.count(),
      customers: await tx.customer.count(),
      orders: await tx.order.count(),
    }));
    expect(seen?.zones.map((zone) => zone.districts.map((district) => district.districtId))).toEqual([["doun_penh"]]);
    expect(seen).toMatchObject({ drivers: 0, customers: 0, orders: 0 });
  });

  it("refuses an order filed under another shop, or carrying a token the buyer wasn't given", async () => {
    await expect(withPublicStore(app, slugA, (tx) => placeOrder(tx, storeB, newToken()))).rejects.toThrow();
    await expect(
      withPublicStore(app, slugA, async (tx, storeId) => {
        await asOrderBuyer(tx, newToken());
        return tx.order.create({ data: { ...(await orderRowLike(tx, storeId)), publicToken: newToken() } });
      }),
    ).rejects.toThrow();
  });

  it("refuses lines added to someone else's order", async () => {
    await expect(
      withPublicStore(app, slugA, async (tx, storeId) => {
        await asOrderBuyer(tx, newToken());
        return tx.orderItem.create({
          data: { storeId, orderId: firstOrderId, variantId: variantA, titleKm: "x", titleEn: "x", unitPriceMinor: 0, quantity: 1, lineTotalMinor: 0 },
        });
      }),
    ).rejects.toThrow();
  });

  it("finds an order again by its checkout key — in the same shop only", async () => {
    const tokenOf = (slug: string, key: string) =>
      withPublicStore(app, slug, async (tx) => (await tx.$queryRaw<{ token: string | null }[]>`SELECT app_order_token_by_key(${key}::uuid) AS token`)[0]?.token);
    expect(await tokenOf(slugA, firstKey)).toBe(firstToken);
    expect(await tokenOf(slugA, randomUUID())).toBeNull();
    expect(await tokenOf(slugB, firstKey)).toBeNull();
    // And the database itself refuses a second order with the same key.
    await expect(withPublicStore(app, slugA, (tx, storeId) => placeOrder(tx, storeId, newToken(), firstKey))).rejects.toThrow();
  });

  it("refuses an order whose total doesn't add up", async () => {
    await expect(
      withPublicStore(app, slugA, async (tx, storeId) => {
        const token = newToken();
        await asOrderBuyer(tx, token);
        return tx.order.create({ data: { ...(await orderRowLike(tx, storeId)), publicToken: token, totalMinor: 1 } });
      }),
    ).rejects.toThrow();
  });

  it("shows merchant A their own orders and customers only, and keeps the record unchangeable", async () => {
    const seen = await withContext(app, { merchantId: merchantA, storeId: storeA }, async (tx) => ({
      orders: await tx.order.findMany({ where: { storeId: { in: [storeA, storeB] } }, select: { storeId: true } }),
      customers: await tx.customer.findMany({ where: { storeId: { in: [storeA, storeB] } }, select: { storeId: true, phone: true } }),
    }));
    expect(new Set(seen.orders.map((order) => order.storeId))).toEqual(new Set([storeA]));
    expect(seen.orders).toHaveLength(2);
    // The same phone ordering twice is one customer.
    expect(seen.customers).toEqual([{ storeId: storeA, phone: "85597123456" }]);
    await expect(withContext(app, { merchantId: merchantA, storeId: storeA }, (tx) => tx.order.deleteMany({ where: { id: firstOrderId } }))).rejects.toThrow();
    await expect(
      withContext(app, { merchantId: merchantA, storeId: storeA }, (tx) => tx.orderItem.updateMany({ where: { orderId: firstOrderId }, data: { quantity: 9 } })),
    ).rejects.toThrow();
    const fromB = await withContext(app, { merchantId: merchantB, storeId: storeB }, (tx) => tx.order.findUnique({ where: { id: firstOrderId } }));
    expect(fromB).toBeNull();
  });

  /** A valid order row for the negative tests (customer saved, number taken). */
  async function orderRowLike(tx: Tx, storeId: string) {
    const [customer] = await tx.$queryRaw<{ id: string }[]>`SELECT app_save_customer(${"85511111111"}, ${"X"}, 'phnom_penh'::"DeliveryArea", ${null}, ${null}, ${""}) AS id`;
    const [number] = await tx.$queryRaw<{ n: number }[]>`SELECT app_next_order_number() AS n`;
    return {
      storeId,
      customerId: customer!.id,
      orderNumber: number!.n,
      status: "cod_pending" as const,
      paymentMethod: "cod" as const,
      currency: "USD" as const,
      subtotalMinor: 100,
      discountMinor: 0,
      deliveryFeeMinor: 0,
      vatPercent: 0,
      vatMinor: 0,
      totalMinor: 100,
      exchangeRateUsed: 4100,
      fulfilment: "pickup" as const,
      area: "phnom_penh" as const,
      buyerName: "X",
      buyerPhone: "85511111111",
      idempotencyKey: randomUUID(),
    };
  }
});
