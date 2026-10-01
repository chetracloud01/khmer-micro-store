import type { SystemDb } from "@khmer-micro-store/db";

export interface TelegramIdentity {
  telegramId: string;
  username?: string;
  firstName: string;
  lastName?: string;
}

/**
 * Sign-up and log-in are one flow (docs/blueprint.md "Merchant sign-up and
 * login"): the first verified Telegram login creates the merchant, later ones
 * find them and refresh their name and username.
 */
export async function findOrCreateTelegramMerchant(db: SystemDb, identity: TelegramIdentity): Promise<string> {
  return db.$transaction(async (tx) => {
    const existing = await tx.merchantIdentity.findUnique({
      where: { method_providerUserId: { method: "telegram", providerUserId: identity.telegramId } },
    });
    if (existing) {
      await tx.merchantIdentity.update({ where: { id: existing.id }, data: { telegramUsername: identity.username ?? null } });
      return existing.merchantId;
    }
    const merchant = await tx.merchant.create({
      data: {
        firstName: identity.firstName,
        lastName: identity.lastName ?? "",
        identities: { create: { method: "telegram", providerUserId: identity.telegramId, telegramUsername: identity.username ?? null } },
      },
    });
    await tx.auditLog.create({ data: { actorType: "merchant", actorId: merchant.id, action: "merchant.signed_up", entity: "merchant", entityId: merchant.id } });
    return merchant.id;
  });
}
