import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAppDb, createSystemDb, withContext, withPublicStore, type AppDb, type SystemDb } from "./index";

// Step 3's checks on the real database: each store's catalog is its own, and
// the shop page's public read shows only a store's visible, not-deleted
// products — never hidden ones, deleted ones, or another store's.

const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DATABASE_OWNER_URL;

describe.skipIf(!appUrl || !ownerUrl)("catalog row-level security", () => {
  let app: AppDb;
  let system: SystemDb;
  const run = randomUUID().slice(0, 8);
  const merchantA = randomUUID();
  const merchantB = randomUUID();
  const storeA = randomUUID();
  const storeB = randomUUID();
  const slugA = `cat-test-${run}-a`;
  const slugB = `cat-test-${run}-b`;
  const products = { visible: randomUUID(), hidden: randomUUID(), deleted: randomUUID(), otherStore: randomUUID() };

  async function seedStore(merchantId: string, storeId: string, slug: string) {
    await system.merchant.create({ data: { id: merchantId, firstName: slug } });
    const category = randomUUID();
    await system.store.create({
      data: {
        id: storeId,
        slug,
        name: `Shop ${slug}`,
        businessType: "shop",
        members: { create: { merchantId, role: "owner" } },
        categories: { create: { id: category, nameKm: "ប្រភេទ", nameEn: "Category" } },
      },
    });
    return category;
  }

  async function seedProduct(id: string, storeId: string, categoryId: string, extra: { isVisible?: boolean; deletedAt?: Date } = {}) {
    await system.product.create({
      data: {
        id,
        storeId,
        categoryId,
        titleKm: `ទំនិញ ${id.slice(0, 4)}`,
        titleEn: `Product ${id.slice(0, 4)}`,
        ...extra,
        variants: { create: { storeId, sku: `SKU-${id.slice(0, 8)}`, isDefault: true, priceUsdCents: 500 } },
        photos: { create: { storeId, fileKey: `stores/${storeId}/${id}.webp` } },
      },
    });
  }

  beforeAll(async () => {
    app = createAppDb(appUrl as string);
    system = createSystemDb(ownerUrl as string);
    const categoryA = await seedStore(merchantA, storeA, slugA);
    const categoryB = await seedStore(merchantB, storeB, slugB);
    await seedProduct(products.visible, storeA, categoryA);
    await seedProduct(products.hidden, storeA, categoryA, { isVisible: false });
    await seedProduct(products.deleted, storeA, categoryA, { deletedAt: new Date() });
    await seedProduct(products.otherStore, storeB, categoryB);
  });

  afterAll(async () => {
    await system?.store.deleteMany({ where: { id: { in: [storeA, storeB] } } });
    await system?.merchant.deleteMany({ where: { id: { in: [merchantA, merchantB] } } });
    await app?.$disconnect();
    await system?.$disconnect();
  });

  const testProducts = { id: { in: Object.values(products) } };

  it("shows merchant A all of their own products, hidden ones included, and none of B's", async () => {
    const seen = await withContext(app, { merchantId: merchantA, storeId: storeA }, (tx) => tx.product.findMany({ where: testProducts }));
    expect(seen.map((product) => product.id).sort()).toEqual([products.visible, products.hidden, products.deleted].sort());
  });

  it("doesn't let A change B's products, variants or photos", async () => {
    const changed = await withContext(app, { merchantId: merchantA, storeId: storeA }, async (tx) => ({
      product: await tx.product.updateMany({ where: { id: products.otherStore }, data: { titleEn: "taken" } }),
      variants: await tx.productVariant.updateMany({ where: { productId: products.otherStore }, data: { priceUsdCents: 1 } }),
      photos: await tx.productPhoto.deleteMany({ where: { productId: products.otherStore } }),
    }));
    expect(changed).toEqual({ product: { count: 0 }, variants: { count: 0 }, photos: { count: 0 } });
  });

  it("refuses a product filed under another store", async () => {
    await expect(
      withContext(app, { merchantId: merchantA, storeId: storeA }, (tx) =>
        tx.brand.create({ data: { storeId: storeB, nameKm: "x", nameEn: "x" } }),
      ),
    ).rejects.toThrow();
  });

  it("shows a buyer only the shop's visible products, with their prices and photos", async () => {
    const result = await withPublicStore(app, slugA, async (tx, storeId) => ({
      storeId,
      store: await tx.store.findUnique({ where: { id: storeId }, select: { name: true } }),
      products: await tx.product.findMany({ where: testProducts, include: { variants: true, photos: true } }),
      variants: await tx.productVariant.count({ where: { productId: { in: Object.values(products) } } }),
    }));
    expect(result?.storeId).toBe(storeA);
    expect(result?.store?.name).toBe(`Shop ${slugA}`);
    expect(result?.products.map((product) => product.id)).toEqual([products.visible]);
    expect(result?.products[0]?.variants).toHaveLength(1);
    expect(result?.products[0]?.photos).toHaveLength(1);
    // The hidden and deleted products' variants stay out of reach too.
    expect(result?.variants).toBe(1);
  });

  it("gives a buyer nothing else: no other store, no members, no writes", async () => {
    const result = await withPublicStore(app, slugA, async (tx) => ({
      otherStore: await tx.store.findUnique({ where: { id: storeB } }),
      members: await tx.storeMember.findMany({ where: { storeId: storeA } }),
      subscription: await tx.subscription.findUnique({ where: { storeId: storeA } }),
    }));
    expect(result).toEqual({ otherStore: null, members: [], subscription: null });
    await expect(
      withPublicStore(app, slugA, (tx) => tx.product.updateMany({ where: { id: products.visible }, data: { titleEn: "x" } })),
    ).resolves.toEqual({ count: 0 });
  });

  it("finds no shop for an unknown link", async () => {
    expect(await withPublicStore(app, `no-such-shop-${run}`, async () => "found")).toBeNull();
  });
});
