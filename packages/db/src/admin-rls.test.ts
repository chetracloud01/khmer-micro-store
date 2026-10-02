import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAppDb, createSystemDb, withContext, withPublicStore, type AppDb, type SystemDb } from "./index";

// Step 7's checks on the real database: the admin tables belong to the owner
// user alone. The API's everyday user — the one serving sellers and buyers —
// can't read or write them, as a merchant, as a buyer, or with no context.

const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DATABASE_OWNER_URL;

describe.skipIf(!appUrl || !ownerUrl)("admin tables", () => {
  let app: AppDb;
  let system: SystemDb;
  const run = randomUUID().slice(0, 8);
  const merchantId = randomUUID();
  const storeId = randomUUID();
  const slug = `adm-test-${run}`;
  let adminId = "";

  beforeAll(async () => {
    app = createAppDb(appUrl as string);
    system = createSystemDb(ownerUrl as string);
    await system.merchant.create({ data: { id: merchantId, firstName: slug } });
    await system.store.create({ data: { id: storeId, slug, name: slug, businessType: "shop", members: { create: { merchantId, role: "owner" } } } });
    const admin = await system.adminUser.create({ data: { name: "Test owner", telegramId: `5${Date.now()}`.slice(0, 12), role: "owner" } });
    adminId = admin.id;
    await system.adminSession.create({ data: { adminUserId: admin.id, tokenHash: `test-${run}`, stage: "active", expiresAt: new Date(Date.now() + 60_000) } });
    await system.adminBackupCode.create({ data: { adminUserId: admin.id, codeHash: `test-${run}` } });
  });

  afterAll(async () => {
    await system?.adminUser.deleteMany({ where: { id: adminId } });
    await system?.store.deleteMany({ where: { id: storeId } });
    await system?.merchant.deleteMany({ where: { id: merchantId } });
    await app?.$disconnect();
    await system?.$disconnect();
  });

  it("can't be read by the everyday user, with or without a context", async () => {
    await expect(app.adminUser.findMany()).rejects.toThrow(/permission denied/i);
    await expect(withContext(app, { merchantId, storeId }, (tx) => tx.adminSession.findMany())).rejects.toThrow(/permission denied/i);
    await expect(withPublicStore(app, slug, (tx) => tx.adminBackupCode.findMany())).rejects.toThrow(/permission denied/i);
  });

  it("can't be written by the everyday user — nobody makes themselves an admin through the API's user", async () => {
    await expect(app.adminUser.create({ data: { name: "Intruder", telegramId: "123456789", role: "owner" } })).rejects.toThrow(/permission denied/i);
    await expect(app.adminSession.updateMany({ data: { stage: "active" } })).rejects.toThrow(/permission denied/i);
  });

  it("is the owner user's to read (the admin API, the worker, the add-owner command)", async () => {
    expect(await system.adminSession.count({ where: { adminUserId: adminId } })).toBe(1);
    expect(await system.adminBackupCode.count({ where: { adminUserId: adminId } })).toBe(1);
  });
});
