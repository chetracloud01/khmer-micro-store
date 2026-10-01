-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('not_submitted', 'pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "LoginMethod" AS ENUM ('telegram', 'phone', 'google');

-- CreateEnum
CREATE TYPE "StoreRole" AS ENUM ('owner', 'staff');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('shop', 'restaurant', 'service', 'other');

-- CreateEnum
CREATE TYPE "DeliveryArea" AS ENUM ('phnom_penh', 'province');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'KHR');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('bakong_khqr', 'aba_payway');

-- CreateEnum
CREATE TYPE "PlanId" AS ENUM ('free', 'basic', 'pro', 'advance');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'grace', 'paused');

-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('admin', 'merchant', 'system');

-- CreateTable
CREATE TABLE "merchants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL DEFAULT '',
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'not_submitted',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_identities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "method" "LoginMethod" NOT NULL,
    "provider_user_id" TEXT NOT NULL,
    "telegram_username" TEXT,
    "verified_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "merchant_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "merchant_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "merchant_id" UUID NOT NULL,
    "role" "StoreRole" NOT NULL DEFAULT 'owner',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "business_type" "BusinessType" NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "area" "DeliveryArea" NOT NULL DEFAULT 'phnom_penh',
    "description" TEXT NOT NULL DEFAULT '',
    "logo_key" TEXT,
    "languages" TEXT[] DEFAULT ARRAY['km', 'en']::TEXT[],
    "default_currency" "Currency" NOT NULL DEFAULT 'USD',
    "usd_to_khr_rate" INTEGER NOT NULL DEFAULT 4100,
    "allow_cod" BOOLEAN NOT NULL DEFAULT true,
    "vat_percent" INTEGER NOT NULL DEFAULT 0,
    "online_stock_location_id" UUID,
    "pickup_enabled" BOOLEAN NOT NULL DEFAULT false,
    "pickup_address" TEXT NOT NULL DEFAULT '',
    "pickup_hours" TEXT NOT NULL DEFAULT '',
    "province_delivery_enabled" BOOLEAN NOT NULL DEFAULT false,
    "province_fee_usd_cents" INTEGER,
    "province_fee_khr" INTEGER,
    "province_note" TEXT NOT NULL DEFAULT '',
    "delivery_configured_at" TIMESTAMPTZ(6),
    "link_shared_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_payment_configs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "bakong_account_id" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_payment_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "plan" "PlanId" NOT NULL DEFAULT 'free',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "current_period_start" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMPTZ(6),
    "trial_ends_at" TIMESTAMPTZ(6),
    "pending_plan" "PlanId",
    "billing_currency" "Currency" NOT NULL DEFAULT 'USD',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "name_km" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "key" TEXT,
    "name_km" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "platform_name" TEXT NOT NULL,
    "support_telegram" TEXT NOT NULL,
    "usd_to_khr_min" INTEGER NOT NULL,
    "usd_to_khr_max" INTEGER NOT NULL,
    "alert_chat_id" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_type" "ActorType" NOT NULL,
    "actor_id" UUID,
    "store_id" UUID,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "merchant_identities_merchant_id_idx" ON "merchant_identities"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "merchant_identities_method_provider_user_id_key" ON "merchant_identities"("method", "provider_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_merchant_id_idx" ON "sessions"("merchant_id");

-- CreateIndex
CREATE INDEX "store_members_merchant_id_idx" ON "store_members"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_members_store_id_merchant_id_key" ON "store_members"("store_id", "merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "stores"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "store_payment_configs_store_id_provider_key" ON "store_payment_configs"("store_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_store_id_key" ON "subscriptions"("store_id");

-- CreateIndex
CREATE INDEX "categories_store_id_idx" ON "categories"("store_id");

-- CreateIndex
CREATE INDEX "units_store_id_idx" ON "units"("store_id");

-- CreateIndex
CREATE INDEX "audit_logs_store_id_at_idx" ON "audit_logs"("store_id", "at");

-- AddForeignKey
ALTER TABLE "merchant_identities" ADD CONSTRAINT "merchant_identities_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_members" ADD CONSTRAINT "store_members_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_members" ADD CONSTRAINT "store_members_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "merchants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_payment_configs" ADD CONSTRAINT "store_payment_configs_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- Row-level security (docs/blueprint.md "Multi-tenant safety")
--
-- khmer_micro_store_app is the API's everyday database user. It is created
-- outside migrations (infra/setup-local-db.sql locally, the CI workflow, the
-- host in production) and must not own tables or bypass RLS. The owner,
-- khmer_micro_store, runs migrations and the worker and is not limited.
-- =====================================================================

GRANT USAGE ON SCHEMA public TO khmer_micro_store_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO khmer_micro_store_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO khmer_micro_store_app;
-- Tables added by later migrations get the same everyday rights; each one must enable RLS too.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO khmer_micro_store_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO khmer_micro_store_app;

-- Only the owner reads or writes these. (Prisma's own table doesn't exist in its shadow database.)
REVOKE ALL ON sessions FROM khmer_micro_store_app;
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    REVOKE ALL ON "_prisma_migrations" FROM khmer_micro_store_app;
  END IF;
END
$$;
-- Read-only for the API's everyday user: plans change through billing, settings through the admin.
REVOKE INSERT, UPDATE, DELETE ON platform_settings, subscriptions FROM khmer_micro_store_app;
-- The audit log is append-only.
REVOKE UPDATE, DELETE ON audit_logs FROM khmer_micro_store_app;

-- Who a request acts for, set per transaction by packages/db withContext().
CREATE FUNCTION app_current_merchant() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.merchant_id', true), '')::uuid $$;

-- The store a request acts for — but only if the current merchant is a member
-- of it, so setting another shop's id gets nothing. SECURITY DEFINER (runs as
-- the owner) so it can read store_members without going through the policy
-- below that calls it.
CREATE FUNCTION app_current_store() RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$
    SELECT m.store_id FROM store_members m
    WHERE m.store_id = nullif(current_setting('app.store_id', true), '')::uuid
      AND m.merchant_id = app_current_merchant()
  $$;
REVOKE ALL ON FUNCTION app_current_store() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_current_store() TO khmer_micro_store_app;

-- A merchant sees only themself and their own login methods.
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
CREATE POLICY merchant_self ON merchants
  USING (id = app_current_merchant()) WITH CHECK (id = app_current_merchant());

ALTER TABLE merchant_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY identity_owner ON merchant_identities
  USING (merchant_id = app_current_merchant()) WITH CHECK (merchant_id = app_current_merchant());

-- No policy: the everyday user sees no sessions at all (login runs as the owner).
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Memberships: your own, and everyone's in the store you're acting for.
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_rows ON store_members
  USING (merchant_id = app_current_merchant() OR store_id = app_current_store())
  WITH CHECK (store_id = app_current_store());

-- Stores: the ones you belong to. New stores are created by the owner user (onboarding).
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_rows ON stores
  USING (id = app_current_store() OR id IN (SELECT store_id FROM store_members WHERE merchant_id = app_current_merchant()))
  WITH CHECK (id = app_current_store());

-- Everything else that belongs to a store: that store's rows only.
ALTER TABLE store_payment_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON store_payment_configs
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON subscriptions
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON categories
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE units ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON units
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

-- A merchant's audit entries: their store's, written as themself. Admin and system entries are written by the owner.
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON audit_logs
  USING (store_id = app_current_store())
  WITH CHECK (store_id = app_current_store() AND actor_type = 'merchant' AND actor_id = app_current_merchant());

-- Platform settings: one row, readable by everyone, changed only by the admin (owner user).
INSERT INTO platform_settings (id, platform_name, support_telegram, usd_to_khr_min, usd_to_khr_max)
VALUES (1, 'Khmer Micro-Store', '@kms_support', 3900, 4300);
