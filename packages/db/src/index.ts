import { PrismaClient, type Prisma } from "@prisma/client";

export * from "@prisma/client";

// Two ways into the database (docs/blueprint.md "Multi-tenant safety"):
//
// - AppDb, the API's everyday user (khmer_micro_store_app). Row-level security
//   applies: inside withContext() it sees only the signed-in merchant and the
//   store they act for, and outside it sees nothing. All shop data goes
//   through this one.
// - SystemDb, the owner (khmer_micro_store). Not limited: only for the few
//   things that must look across shops — login, sessions, creating a store,
//   checking a link is free, the worker and (later) the admin area.
//
// The two are different types, so one can't be passed where the other is meant.

declare const kind: unique symbol;
export type AppDb = PrismaClient & { readonly [kind]: "app" };
export type SystemDb = PrismaClient & { readonly [kind]: "system" };
export type Tx = Prisma.TransactionClient;

export function createAppDb(url: string): AppDb {
  return new PrismaClient({ datasources: { db: { url } } }) as AppDb;
}

export function createSystemDb(url: string): SystemDb {
  return new PrismaClient({ datasources: { db: { url } } }) as SystemDb;
}

export interface RequestContext {
  merchantId: string;
  /** The store the request acts for. The database ignores it unless the merchant is a member. */
  storeId?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Runs `work` in one transaction that tells the database who it is for. The
 * setting is local to the transaction, so it can never leak into another
 * request sharing the same connection.
 */
export async function withContext<T>(db: AppDb, context: RequestContext, work: (tx: Tx) => Promise<T>): Promise<T> {
  if (!UUID.test(context.merchantId) || (context.storeId !== undefined && !UUID.test(context.storeId))) {
    throw new Error("withContext: merchantId and storeId must be UUIDs");
  }
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.merchant_id', ${context.merchantId}, true), set_config('app.store_id', ${context.storeId ?? ""}, true)`;
    return work(tx);
  });
}
