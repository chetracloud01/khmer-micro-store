import type { SystemDb } from "@khmio/db";
import { BUSINESS_TYPE_DEFAULTS, DEFAULT_UNITS, PLANS, type CreateStoreInput } from "@khmio/shared";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";

export type CreateStoreResult = { ok: true; storeId: string } | { ok: false; reason: "slug_taken" | "already_has_store" };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Onboarding's two answers become a shop, all or nothing: the store, the
 * merchant as its owner, the 14-day Free trial, and the business type's
 * categories and units. Runs as the owner user because the merchant isn't a
 * member yet — row-level security would rightly refuse them.
 */
export async function createStore(db: SystemDb, merchantId: string, input: CreateStoreInput, now = new Date()): Promise<CreateStoreResult> {
  const defaults = BUSINESS_TYPE_DEFAULTS[input.businessType];
  const storeId = randomUUID();
  const trialDays = PLANS.free.trialDays ?? 14;
  try {
    return await db.$transaction(async (tx) => {
      // One shop per merchant in Release 1.
      if (await tx.storeMember.findFirst({ where: { merchantId } })) return { ok: false, reason: "already_has_store" } as const;
      await tx.store.create({
        data: {
          id: storeId,
          slug: input.slug,
          name: input.shopName,
          businessType: input.businessType,
          members: { create: { merchantId, role: "owner" } },
          subscription: { create: { plan: "free", status: "trialing", currentPeriodStart: now, trialEndsAt: new Date(now.getTime() + trialDays * DAY_MS) } },
          categories: { create: defaults.categories.map((category, index) => ({ nameKm: category.nameKm, nameEn: category.nameEn, sortOrder: index })) },
          units: { create: DEFAULT_UNITS.map((unit) => ({ key: unit.key, nameKm: unit.nameKm, nameEn: unit.nameEn })) },
        },
      });
      await tx.auditLog.create({
        data: { actorType: "merchant", actorId: merchantId, storeId, action: "store.created", entity: "store", entityId: storeId, after: { slug: input.slug, businessType: input.businessType } },
      });
      return { ok: true, storeId } as const;
    });
  } catch (error) {
    // Someone took the link between the availability check and now.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { ok: false, reason: "slug_taken" };
    throw error;
  }
}

export async function isSlugTaken(db: SystemDb, slug: string): Promise<boolean> {
  return (await db.store.count({ where: { slug } })) > 0;
}
