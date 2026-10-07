// Database backups (admin A13, design/screens.md). The values here are the
// same names the backup_runs table allows (its CHECK constraints).

export const BACKUP_KINDS = ["nightly", "manual"] as const;
export type BackupKind = (typeof BACKUP_KINDS)[number];

export const BACKUP_STATUSES = ["queued", "running", "done", "failed"] as const;
export type BackupStatus = (typeof BACKUP_STATUSES)[number];

/**
 * Why a backup failed, as a fixed reason (the raw error stays in the worker's log):
 * - dump_failed: pg_dump couldn't copy the database;
 * - storage_unreachable: the backup bucket didn't take the file;
 * - interrupted: the worker stopped part way (a deploy or a crash).
 */
export const BACKUP_FAILURES = ["dump_failed", "storage_unreachable", "interrupted"] as const;
export type BackupFailure = (typeof BACKUP_FAILURES)[number];

/** The red "didn't run" banner shows when the newest good backup is older than this. */
export const BACKUP_STALE_HOURS = 26;

/** The monthly full-restore test (blueprint "The routine") counts as late after this. */
export const RESTORE_TEST_LATE_DAYS = 35;

/** One backup as the admin sees it (GET /admin/backups). */
export interface BackupRunView {
  id: string;
  kind: BackupKind;
  status: BackupStatus;
  startedByName: string | null;
  sizeBytes: number | null;
  failure: BackupFailure | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  fileDeletedAt: string | null;
}

/** True when the newest good backup is missing or too old. */
export function backupIsStale(latestDoneAt: Date | null, now = new Date()): boolean {
  return latestDoneAt === null || now.getTime() - latestDoneAt.getTime() > BACKUP_STALE_HOURS * 60 * 60 * 1000;
}
