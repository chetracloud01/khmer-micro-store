import type PgBoss from "pg-boss";
import type { Logger } from "pino";

export const HEARTBEAT_QUEUE = "heartbeat";

/**
 * A job that only says "still running" every 5 minutes — proof the worker and
 * the queue work end to end before the real jobs (KHQR checks, Telegram,
 * order expiry) arrive. Every job follows this pattern: create the queue,
 * then schedule or send to it, then work it.
 */
export async function registerHeartbeat(boss: PgBoss, logger: Logger): Promise<void> {
  await boss.createQueue(HEARTBEAT_QUEUE);
  await boss.schedule(HEARTBEAT_QUEUE, "*/5 * * * *");
  await boss.work(HEARTBEAT_QUEUE, async () => {
    logger.info("worker heartbeat");
  });
}
