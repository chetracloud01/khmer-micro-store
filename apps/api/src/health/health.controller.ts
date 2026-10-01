import { Controller, Get, Inject, Res } from "@nestjs/common";
import type { Pool } from "pg";
import { DB_POOL } from "../db";

interface StatusResponse {
  status(code: number): unknown;
}

/**
 * For the host's health check and uptime alerts: 200 when the API can reach
 * the database, 503 when it can't. Says nothing else about the system.
 */
@Controller("health")
export class HealthController {
  constructor(@Inject(DB_POOL) private readonly pool: Pool) {}

  @Get()
  async check(@Res({ passthrough: true }) res: StatusResponse) {
    const database = await this.pool
      .query("select 1")
      .then(() => "up" as const)
      .catch(() => "down" as const);
    if (database === "down") res.status(503);
    return { status: database === "up" ? "ok" : "degraded", database };
  }
}
