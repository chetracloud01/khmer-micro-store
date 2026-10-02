-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('owner', 'support', 'finance');

-- CreateEnum
CREATE TYPE "AdminSessionStage" AS ENUM ('pending_2fa', 'active');

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "telegram_id" TEXT NOT NULL,
    "telegram_username" TEXT NOT NULL DEFAULT '',
    "role" "AdminRole" NOT NULL,
    "totp_secret_enc" TEXT,
    "totp_pending_enc" TEXT,
    "totp_last_step" INTEGER NOT NULL DEFAULT 0,
    "failed_codes" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(6),
    "disabled_at" TIMESTAMPTZ(6),
    "last_active_at" TIMESTAMPTZ(6),
    "invited_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_backup_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "stage" "AdminSessionStage" NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_telegram_id_key" ON "admin_users"("telegram_id");

-- CreateIndex
CREATE INDEX "admin_backup_codes_admin_user_id_idx" ON "admin_backup_codes"("admin_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_user_id_idx" ON "admin_sessions"("admin_user_id");

-- AddForeignKey
ALTER TABLE "admin_backup_codes" ADD CONSTRAINT "admin_backup_codes_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- Admin tables: only the owner user (the admin API, the worker, the
-- add-owner command) may touch them. The API's everyday user — the one
-- that serves sellers and buyers — can't read or write them at all.
-- =====================================================================

REVOKE ALL ON admin_users, admin_backup_codes, admin_sessions FROM khmer_micro_store_app;

-- No store_id, so no store policy; row-level security on with no policy = nothing for anyone but the owner.
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_backup_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

ALTER TABLE admin_users ADD CONSTRAINT admin_users_failed_codes_not_negative CHECK (failed_codes >= 0);

-- =====================================================================
-- Admin alerts join the worker's messages.
-- =====================================================================

ALTER TABLE outbox_events DROP CONSTRAINT outbox_events_kind_known;
ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_kind_known CHECK (kind IN ('order_placed', 'order_cancelled_by_buyer', 'admin_alert'));
