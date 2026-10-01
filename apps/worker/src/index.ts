import { EnvError, loadEnv, workerEnvSchema, type WorkerEnv } from "@khmer-micro-store/shared";
import * as Sentry from "@sentry/node";
import PgBoss from "pg-boss";
import pino from "pino";
import { registerHeartbeat } from "./jobs/heartbeat";

// The background worker (docs/blueprint.md "System architecture"): payment
// checks, Telegram messages and expiring unpaid orders run here, never inside
// a buyer's request. Jobs are kept in PostgreSQL by pg-boss, so the worker
// needs no other service than the database the API already uses.

function readSettings(): WorkerEnv {
  try {
    return loadEnv(workerEnvSchema, process.env);
  } catch (error) {
    if (error instanceof EnvError) {
      // Names the bad settings, never their values.
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

async function main() {
  const env = readSettings();
  const logger = pino({ level: env.LOG_LEVEL, redact: { paths: ["*.phone", "*.token", "*.secret", "*.apiKey"], censor: "[redacted]" } });
  if (env.SENTRY_DSN) Sentry.init({ dsn: env.SENTRY_DSN, environment: env.NODE_ENV, sendDefaultPii: false, tracesSampleRate: 0 });
  const report = (error: unknown, message: string) => {
    logger.error({ err: error }, message);
    if (env.SENTRY_DSN) Sentry.captureException(error);
  };

  // Its own schema keeps pg-boss's tables apart from the app's.
  const boss = new PgBoss({ connectionString: env.DATABASE_URL, schema: "pgboss" });
  boss.on("error", (error) => report(error, "job queue error"));
  await boss.start();
  await registerHeartbeat(boss, logger);
  logger.info({ environment: env.NODE_ENV }, "worker started");

  // Finish the jobs in hand before stopping, so a deploy never cuts a payment check in half.
  let stopping = false;
  const stop = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, "worker stopping");
    await boss.stop({ graceful: true, wait: true });
    process.exit(0);
  };
  process.on("SIGINT", () => void stop("SIGINT"));
  process.on("SIGTERM", () => void stop("SIGTERM"));
}

main().catch((error: unknown) => {
  // The database is the usual reason: say so plainly, without the connection string.
  process.stderr.write(`worker failed to start: ${error instanceof Error ? error.message : "unknown error"}\n`);
  process.exit(1);
});
