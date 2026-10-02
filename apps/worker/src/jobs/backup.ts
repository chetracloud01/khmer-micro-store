import type { SystemDb } from "@khmer-micro-store/db";
import type { AdminAlert, WorkerEnv } from "@khmer-micro-store/shared";
import type PgBoss from "pg-boss";
import type { Logger } from "pino";
import { pgDumpCommand, pruneBackups, runBackup, s3Client } from "../backup/backup";

export const BACKUP_QUEUE = "backup";

/** The S3 client and bucket for backups (the schema has checked they're set when BACKUPS=on). */
export function backupTarget(env: WorkerEnv) {
  const { S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BACKUP_BUCKET } = env;
  if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_BACKUP_BUCKET) throw new Error("backup settings missing");
  return { client: s3Client({ endpoint: S3_ENDPOINT, region: env.S3_REGION, accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY }), bucket: S3_BACKUP_BUCKET };
}

/** One backup and the clean-up after it. A failure goes to the admins' Telegram, and tomorrow's run tries again. */
export async function backupOnce(env: WorkerEnv, db: SystemDb, logger: Logger): Promise<void> {
  const { client, bucket } = backupTarget(env);
  try {
    const { key, bytes } = await runBackup(client, bucket, pgDumpCommand(env.PG_DUMP_PATH, env.DATABASE_OWNER_URL));
    const removed = await pruneBackups(client, bucket, env.BACKUP_KEEP_DAYS);
    logger.info({ key, bytes, removed }, "database backup done");
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 200) : "unknown error";
    logger.error({ detail }, "database backup failed");
    const alert: AdminAlert = { reason: "backup_failed", detail };
    await db.outboxEvent.create({ data: { kind: "admin_alert", payload: alert } }).catch(() => undefined);
  }
}

/** Every night at 03:00 Phnom Penh time, when shops are quiet. */
export async function registerBackup(boss: PgBoss, env: WorkerEnv, db: SystemDb, logger: Logger): Promise<void> {
  await boss.createQueue(BACKUP_QUEUE);
  await boss.schedule(BACKUP_QUEUE, "0 3 * * *", {}, { tz: "Asia/Phnom_Penh" });
  await boss.work(BACKUP_QUEUE, async () => backupOnce(env, db, logger));
}
