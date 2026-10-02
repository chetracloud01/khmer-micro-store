-- CreateEnum
CREATE TYPE "TelegramLinkKind" AS ENUM ('group_link', 'order_follow');

-- CreateTable
CREATE TABLE "store_alert_chats" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "chat_id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "linked_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_alert_chats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_followers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "chat_id" TEXT NOT NULL,
    "stopped_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_followers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telegram_link_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "TelegramLinkKind" NOT NULL,
    "code_hash" TEXT NOT NULL,
    "store_id" UUID NOT NULL,
    "order_id" UUID,
    "created_by" UUID,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "store_alert_chats_chat_id_idx" ON "store_alert_chats"("chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_alert_chats_store_id_chat_id_key" ON "store_alert_chats"("store_id", "chat_id");

-- CreateIndex
CREATE INDEX "order_followers_chat_id_idx" ON "order_followers"("chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_followers_order_id_chat_id_key" ON "order_followers"("order_id", "chat_id");

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_codes_code_hash_key" ON "telegram_link_codes"("code_hash");

-- AddForeignKey
ALTER TABLE "store_alert_chats" ADD CONSTRAINT "store_alert_chats_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_followers" ADD CONSTRAINT "order_followers_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- Staff groups and order followers: each shop's own (row-level security)
-- =====================================================================

ALTER TABLE store_alert_chats ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON store_alert_chats
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE order_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON order_followers
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());
-- The buyer's order page may see whether its own order is followed (never another order's).
CREATE POLICY buyer_read ON order_followers FOR SELECT
  USING (store_id = app_public_store()
         AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.store_id = app_public_store() AND o.public_token = app_order_token()));
-- Followers are added only by the worker (owner user), after the buyer presses Start.
REVOKE INSERT ON order_followers FROM khmer_micro_store_app;

-- =====================================================================
-- One-time Telegram link codes: the API may create them, never read them.
-- A seller makes a group code for their own shop; a buyer makes a follow
-- code for the order whose link they hold. Only the worker reads and uses them.
-- =====================================================================

REVOKE ALL ON telegram_link_codes FROM khmer_micro_store_app;
GRANT INSERT ON telegram_link_codes TO khmer_micro_store_app;
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY seller_group_code ON telegram_link_codes FOR INSERT
  WITH CHECK (kind = 'group_link' AND store_id = app_current_store() AND order_id IS NULL);
CREATE POLICY buyer_follow_code ON telegram_link_codes FOR INSERT
  WITH CHECK (kind = 'order_follow' AND store_id = app_public_store()
              AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.store_id = app_public_store() AND o.public_token = app_order_token()));
ALTER TABLE telegram_link_codes ADD CONSTRAINT telegram_link_codes_order_matches_kind CHECK ((kind = 'order_follow') = (order_id IS NOT NULL));

-- =====================================================================
-- A paused shop takes no orders (blueprint "Subscription life cycle").
-- The buyer can't read subscriptions, so this answers just yes or no.
-- =====================================================================

CREATE FUNCTION app_public_store_open() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT NOT EXISTS (SELECT 1 FROM subscriptions WHERE store_id = app_public_store() AND status = 'paused') $$;
REVOKE ALL ON FUNCTION app_public_store_open() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_public_store_open() TO khmer_micro_store_app;

-- =====================================================================
-- Status updates for followers join the worker's messages; a buyer's own
-- cancel now also tells the buyer's followers.
-- =====================================================================

ALTER TABLE outbox_events DROP CONSTRAINT outbox_events_kind_known;
ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_kind_known CHECK (kind IN ('order_placed', 'order_cancelled_by_buyer', 'admin_alert', 'order_status_changed'));

CREATE OR REPLACE FUNCTION app_buyer_cancel_order(expected "OrderStatus") RETURNS boolean
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
  AS $$
  DECLARE cancelled_id uuid;
  DECLARE cancelled_store uuid;
  BEGIN
    IF app_public_store() IS NULL OR app_order_token() IS NULL THEN RAISE EXCEPTION 'no order chosen'; END IF;
    UPDATE orders SET status = 'cancelled', cancel_reason = 'buyer_cancelled', updated_at = now()
    WHERE public_token = app_order_token()
      AND store_id = app_public_store()
      AND status = expected
      AND (status IN ('awaiting_payment', 'cod_pending') OR (status = 'confirmed' AND payment_method = 'cod'))
    RETURNING id, store_id INTO cancelled_id, cancelled_store;
    IF cancelled_id IS NULL THEN RETURN false; END IF;
    INSERT INTO order_status_events (store_id, order_id, status, actor) VALUES (cancelled_store, cancelled_id, 'cancelled', 'buyer');
    INSERT INTO outbox_events (store_id, kind, payload) VALUES (cancelled_store, 'order_cancelled_by_buyer', jsonb_build_object('orderId', cancelled_id));
    INSERT INTO outbox_events (store_id, kind, payload) VALUES (cancelled_store, 'order_status_changed', jsonb_build_object('orderId', cancelled_id, 'status', 'cancelled'));
    RETURN true;
  END $$;
