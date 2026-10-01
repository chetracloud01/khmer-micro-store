import { Inject, Injectable, type OnApplicationShutdown, type Provider } from "@nestjs/common";
import { Pool } from "pg";
import { getEnv } from "./config";

/**
 * A plain Postgres connection for the health check. Prisma takes over the
 * real queries in roadmap step 2 — it can't generate a client before the
 * schema has its first table.
 *
 * Injection uses explicit tokens (`@Inject(DB_POOL)`), never constructor
 * types: the dev runner and the bundler (esbuild) don't emit decorator type
 * metadata, so type-based injection would silently get `undefined`.
 */
export const DB_POOL = Symbol("DB_POOL");

export const dbPoolProvider: Provider = {
  provide: DB_POOL,
  useFactory: () => new Pool({ connectionString: getEnv().DATABASE_URL, max: 5, connectionTimeoutMillis: 2_000 }),
};

@Injectable()
export class DbShutdown implements OnApplicationShutdown {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
