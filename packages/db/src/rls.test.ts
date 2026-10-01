import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAppDb, createSystemDb, withContext, type AppDb, type SystemDb } from "./index";

// The roadmap's step 2 check: merchant A cannot read or change merchant B's
// data, enforced by PostgreSQL itself (the migration's row-level security),
// not by code remembering to filter. Runs against the real database — locally
// from .env, in CI against its own Postgres.

const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DATABASE_OWNER_URL;

describe.skipIf(!appUrl || !ownerUrl)("row-level security", () => {
  let app: AppDb;
  let system: SystemDb;
  const run = randomUUID().slice(0, 8);
  const ids = {
    merchantA: randomUUID(),
    merchantB: randomUUID(),
    storeA: randomUUID(),
    storeB: randomUUID(),
    categoryB: randomUUID(),
  };

  beforeAll(async () => {
    app = createAppDb(appUrl as string);
    system = createSystemDb(ownerUrl as string);
    for (const [merchant, store, name] of [
      [ids.merchantA, ids.storeA, "a"],
      [ids.merchantB, ids.storeB, "b"],
    ] as const) {
      await system.merchant.create({ data: { id: merchant, firstName: `Test ${name}` } });
      await system.store.create({
        data: {
          id: store,
          slug: `rls-test-${run}-${name}`,
          name: `Shop ${name}`,
          businessType: "shop",
          members: { create: { merchantId: merchant, role: "owner" } },
          subscription: { create: {} },
          categories: { create: { id: name === "b" ? ids.categoryB : undefined, nameKm: `ប្រភេទ ${name}`, nameEn: `Category ${name}` } },
        },
      });
    }
  });

  afterAll(async () => {
    await system?.store.deleteMany({ where: { id: { in: [ids.storeA, ids.storeB] } } });
    await system?.merchant.deleteMany({ where: { id: { in: [ids.merchantA, ids.merchantB] } } });
    await app?.$disconnect();
    await system?.$disconnect();
  });

  const testStores = { id: { in: [ids.storeA, ids.storeB] } };

  it("shows nothing at all without a signed-in merchant", async () => {
    expect(await app.store.findMany({ where: testStores })).toEqual([]);
    expect(await app.category.findMany({ where: { storeId: { in: [ids.storeA, ids.storeB] } } })).toEqual([]);
  });

  it("shows merchant A only their own store", async () => {
    const stores = await withContext(app, { merchantId: ids.merchantA }, (tx) => tx.store.findMany({ where: testStores }));
    expect(stores.map((store) => store.id)).toEqual([ids.storeA]);
  });

  it("shows A's own categories, never B's", async () => {
    const categories = await withContext(app, { merchantId: ids.merchantA, storeId: ids.storeA }, (tx) =>
      tx.category.findMany({ where: { storeId: { in: [ids.storeA, ids.storeB] } } }),
    );
    expect(categories.map((category) => category.storeId)).toEqual([ids.storeA]);
  });

  it("ignores A pretending to act for B's store", async () => {
    const seen = await withContext(app, { merchantId: ids.merchantA, storeId: ids.storeB }, async (tx) => ({
      categories: await tx.category.findMany({ where: { storeId: ids.storeB } }),
      subscription: await tx.subscription.findUnique({ where: { storeId: ids.storeB } }),
      stores: await tx.store.findMany({ where: testStores }),
    }));
    expect(seen.categories).toEqual([]);
    expect(seen.subscription).toBeNull();
    expect(seen.stores.map((store) => store.id)).toEqual([ids.storeA]);
  });

  it("refuses to add rows to B's store", async () => {
    await expect(
      withContext(app, { merchantId: ids.merchantA, storeId: ids.storeA }, (tx) =>
        tx.category.create({ data: { storeId: ids.storeB, nameKm: "x", nameEn: "x" } }),
      ),
    ).rejects.toThrow();
  });

  it("changes and deletes none of B's rows", async () => {
    const changed = await withContext(app, { merchantId: ids.merchantA, storeId: ids.storeA }, async (tx) => ({
      updated: await tx.category.updateMany({ where: { id: ids.categoryB }, data: { nameEn: "taken over" } }),
      deleted: await tx.category.deleteMany({ where: { id: ids.categoryB } }),
    }));
    expect(changed).toEqual({ updated: { count: 0 }, deleted: { count: 0 } });
    const categoryB = await system.category.findUnique({ where: { id: ids.categoryB } });
    expect(categoryB?.nameEn).toBe("Category b");
  });

  it("keeps sessions, plans and migrations out of the everyday user's reach", async () => {
    await expect(app.session.findMany()).rejects.toThrow();
    await expect(app.$queryRaw`SELECT * FROM "_prisma_migrations" LIMIT 1`).rejects.toThrow();
    await expect(
      withContext(app, { merchantId: ids.merchantA, storeId: ids.storeA }, (tx) =>
        tx.subscription.update({ where: { storeId: ids.storeA }, data: { plan: "advance" } }),
      ),
    ).rejects.toThrow();
  });
});
