import type { Tx } from "@khmer-micro-store/db";
import { effectivePlan, type PlanId } from "@khmer-micro-store/shared";
import { AppException } from "../errors";

/**
 * The plan whose limits apply to this store right now (packages/shared
 * plans.ts), and whether the store may be changed at all. Read inside the
 * store's own context, so it's always this merchant's store.
 */
export async function storePlan(tx: Tx, storeId: string): Promise<{ plan: PlanId; paused: boolean }> {
  const [subscription, settings] = await Promise.all([
    tx.subscription.findUnique({ where: { storeId }, select: { plan: true, status: true } }),
    tx.platformSettings.findUnique({ where: { id: 1 }, select: { betaAllBasic: true } }),
  ]);
  return {
    plan: effectivePlan(subscription?.plan ?? "free", settings?.betaAllBasic ?? false),
    paused: subscription?.status === "paused",
  };
}

/** A paused store keeps all its data, readable — but nothing can be changed until it pays (blueprint "Subscription life cycle"). */
export async function assertStoreWritable(tx: Tx, storeId: string): Promise<PlanId> {
  const { plan, paused } = await storePlan(tx, storeId);
  if (paused) throw new AppException(403, "store_paused");
  return plan;
}
