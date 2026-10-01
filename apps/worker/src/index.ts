import { createSystemDb } from "@khmer-micro-store/db";
import { EnvError, loadEnv, workerEnvSchema, type WorkerEnv } from "@khmer-micro-store/shared";
import * as Sentry from "@sentry/node";
import PgBoss from "pg-boss";
import pino from "pino";
import { registerHeartbeat } from "./jobs/heartbeat";
import { deliverOutboxOnce } from "./jobs/outbox";
import { pollButtons } from "./jobs/telegram-buttons";
import { createTelegramClient } from "./telegram/client";

/** How often waiting messages are looked for: an alert reaches the seller within a few seconds. */
const OUTBOX_EVERY_MS = 3_000;

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
  // The worker sees every shop (payment checks, expiring orders), so it uses the owner user.
  const boss = new PgBoss({ connectionString: env.DATABASE_OWNER_URL, schema: "pgboss" });
  boss.on("error", (error) => report(error, "job queue error"));
  await boss.start();
  await registerHeartbeat(boss, logger);

  // Telegram alerts: the outbox is read with the owner user (the worker serves every shop).
  const db = createSystemDb(env.DATABASE_OWNER_URL);
  const telegram = createTelegramClient(env.TELEGRAM_BOT_TOKEN, logger);
  let stopping = false;
  const outboxLoop = (async () => {
    while (!stopping) {
      try {
        // A full batch means more may be waiting: go again at once.
        if ((await deliverOutboxOnce({ db, telegram, logger, webOrigin: env.WEB_ORIGIN })) > 0) continue;
      } catch (error) {
        report(error, "outbox round failed");
      }
      await new Promise((resolve) => setTimeout(resolve, OUTBOX_EVERY_MS));
    }
  })();
  // Button presses need a real bot; in dry run there is nothing to listen to.
  const buttonLoop = telegram.dryRun ? Promise.resolve() : pollButtons({ db, telegram, logger, stopped: () => stopping });
  logger.info({ environment: env.NODE_ENV, telegram: telegram.dryRun ? "dry run (no TELEGRAM_BOT_TOKEN)" : "on" }, "worker started");

  // Finish the jobs in hand before stopping, so a deploy never cuts a payment check in half.
  const stop = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, "worker stopping");
    await boss.stop({ graceful: true, wait: true });
    // The outbox round in hand finishes; a long poll for buttons may wait up to its timeout.
    await Promise.race([Promise.all([outboxLoop, buttonLoop]), new Promise((resolve) => setTimeout(resolve, 30_000))]);
    await db.$disconnect();
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
