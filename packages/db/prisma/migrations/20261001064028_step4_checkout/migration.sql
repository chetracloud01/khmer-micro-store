-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('awaiting_payment', 'paid', 'cod_pending', 'confirmed', 'packing', 'waiting_for_driver', 'out_for_delivery', 'delivered', 'completed', 'cancelled', 'failed_delivery');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('khqr', 'aba_payway', 'cod');

-- CreateEnum
CREATE TYPE "Fulfilment" AS ENUM ('delivery', 'pickup');

-- CreateEnum
CREATE TYPE "DriverKind" AS ENUM ('own', 'partner');

-- CreateEnum
CREATE TYPE "OrderCancelReason" AS ENUM ('payment_timeout', 'buyer_cancelled', 'out_of_stock', 'cannot_deliver', 'other');

-- CreateEnum
CREATE TYPE "OrderActor" AS ENUM ('buyer', 'merchant', 'system');

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "last_order_number" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "fee_usd_cents" INTEGER,
    "fee_khr" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zone_districts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "zone_id" UUID NOT NULL,
    "store_id" UUID NOT NULL,
    "district_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_zone_districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_drivers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "kind" "DriverKind" NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "telegram_id" TEXT,
    "area" "DeliveryArea",
    "district_id" TEXT,
    "province_id" TEXT,
    "landmark" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_number" INTEGER NOT NULL,
    "public_token" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "currency" "Currency" NOT NULL,
    "subtotal_minor" INTEGER NOT NULL,
    "discount_minor" INTEGER NOT NULL,
    "delivery_fee_minor" INTEGER NOT NULL,
    "vat_percent" INTEGER NOT NULL,
    "vat_minor" INTEGER NOT NULL,
    "total_minor" INTEGER NOT NULL,
    "exchange_rate_used" INTEGER NOT NULL,
    "fulfilment" "Fulfilment" NOT NULL,
    "area" "DeliveryArea" NOT NULL,
    "district_id" TEXT,
    "province_id" TEXT,
    "landmark" TEXT NOT NULL DEFAULT '',
    "pickup_address" TEXT NOT NULL DEFAULT '',
    "pickup_hours" TEXT NOT NULL DEFAULT '',
    "buyer_name" TEXT NOT NULL,
    "buyer_phone" TEXT NOT NULL,
    "cancel_reason" "OrderCancelReason",
    "cancel_note" TEXT NOT NULL DEFAULT '',
    "stock_taken" BOOLEAN NOT NULL DEFAULT false,
    "idempotency_key" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "title_km" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "variant_label_km" TEXT NOT NULL DEFAULT '',
    "variant_label_en" TEXT NOT NULL DEFAULT '',
    "unit_price_minor" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total_minor" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "actor" "OrderActor" NOT NULL,
    "actor_merchant_id" UUID,
    "at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_zones_store_id_idx" ON "delivery_zones"("store_id");

-- CreateIndex
CREATE INDEX "delivery_zone_districts_zone_id_idx" ON "delivery_zone_districts"("zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zone_districts_store_id_district_id_key" ON "delivery_zone_districts"("store_id", "district_id");

-- CreateIndex
CREATE INDEX "store_drivers_store_id_idx" ON "store_drivers"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_store_id_phone_key" ON "customers"("store_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "orders_public_token_key" ON "orders"("public_token");

-- CreateIndex
CREATE INDEX "orders_store_id_created_at_idx" ON "orders"("store_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "orders_store_id_order_number_key" ON "orders"("store_id", "order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_store_id_idempotency_key_key" ON "orders"("store_id", "idempotency_key");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_status_events_order_id_idx" ON "order_status_events"("order_id");

-- AddForeignKey
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_zone_districts" ADD CONSTRAINT "delivery_zone_districts_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "delivery_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_drivers" ADD CONSTRAINT "store_drivers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- Rules Prisma can't express
-- =====================================================================

-- Fees and amounts are whole cents or riel, never negative, and the total adds up.
ALTER TABLE delivery_zones ADD CONSTRAINT delivery_zones_fees_not_negative CHECK (coalesce(fee_usd_cents, 0) >= 0 AND coalesce(fee_khr, 0) >= 0);
ALTER TABLE stores ADD CONSTRAINT stores_province_fees_not_negative CHECK (coalesce(province_fee_usd_cents, 0) >= 0 AND coalesce(province_fee_khr, 0) >= 0);
ALTER TABLE orders ADD CONSTRAINT orders_amounts_valid CHECK (
  subtotal_minor >= 0 AND discount_minor >= 0 AND delivery_fee_minor >= 0 AND vat_minor >= 0
  AND total_minor >= 0 AND total_minor = subtotal_minor - discount_minor + vat_minor + delivery_fee_minor
);
ALTER TABLE orders ADD CONSTRAINT orders_vat_range CHECK (vat_percent BETWEEN 0 AND 20);
ALTER TABLE orders ADD CONSTRAINT orders_rate_positive CHECK (exchange_rate_used > 0);
ALTER TABLE orders ADD CONSTRAINT orders_number_positive CHECK (order_number > 0);
ALTER TABLE order_items ADD CONSTRAINT order_items_valid CHECK (
  quantity BETWEEN 1 AND 99 AND unit_price_minor >= 0 AND line_total_minor = unit_price_minor * quantity
);

-- An order's lines and history are a record: written once, never changed or removed by the API.
-- Orders themselves change status but are never deleted.
REVOKE UPDATE, DELETE ON order_items FROM khmer_micro_store_app;
REVOKE UPDATE, DELETE ON order_status_events FROM khmer_micro_store_app;
REVOKE DELETE ON orders FROM khmer_micro_store_app;

-- =====================================================================
-- Row-level security: each store's delivery, customers and orders are its own
-- =====================================================================

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON delivery_zones
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE delivery_zone_districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON delivery_zone_districts
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE store_drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON store_drivers
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON customers
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON orders
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON order_items
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE order_status_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON order_status_events
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

-- =====================================================================
-- The buyer (no login)
--
-- The shop page shows the store's delivery zones (public_read, as in step 3).
-- A buyer places an order "as a buyer of this one store" (packages/db
-- withPublicStore + asOrderBuyer): they may add one order — the one carrying
-- the random token the API just made — with its lines and first status, and
-- read that order back by its token (withPublicOrder). They never read the
-- customer list, another order, the drivers, or anything of another store.
-- =====================================================================

CREATE POLICY public_read ON delivery_zones FOR SELECT
  USING (store_id = app_public_store());

CREATE POLICY public_read ON delivery_zone_districts FOR SELECT
  USING (store_id = app_public_store());

CREATE FUNCTION app_order_token() RETURNS text
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.order_token', true), '') $$;

CREATE POLICY buyer_insert ON orders FOR INSERT
  WITH CHECK (store_id = app_public_store() AND public_token = app_order_token());
CREATE POLICY buyer_read ON orders FOR SELECT
  USING (store_id = app_public_store() AND public_token = app_order_token());

CREATE POLICY buyer_insert ON order_items FOR INSERT
  WITH CHECK (store_id = app_public_store()
              AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.store_id = app_public_store() AND o.public_token = app_order_token()));
CREATE POLICY buyer_read ON order_items FOR SELECT
  USING (store_id = app_public_store()
         AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.store_id = app_public_store() AND o.public_token = app_order_token()));

CREATE POLICY buyer_insert ON order_status_events FOR INSERT
  WITH CHECK (store_id = app_public_store() AND actor = 'buyer'
              AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.store_id = app_public_store() AND o.public_token = app_order_token()));
CREATE POLICY buyer_read ON order_status_events FOR SELECT
  USING (store_id = app_public_store()
         AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.store_id = app_public_store() AND o.public_token = app_order_token()));

-- The next order number of the buyer's store, counted up safely under concurrent orders.
CREATE FUNCTION app_next_order_number() RETURNS integer
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
  AS $$
  DECLARE next_number integer;
  BEGIN
    UPDATE stores SET last_order_number = last_order_number + 1
    WHERE id = app_public_store()
    RETURNING last_order_number INTO next_number;
    IF next_number IS NULL THEN RAISE EXCEPTION 'no public store chosen'; END IF;
    RETURN next_number;
  END $$;
REVOKE ALL ON FUNCTION app_next_order_number() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_next_order_number() TO khmer_micro_store_app;

-- Saves the buyer as a customer of the buyer's store (found by phone) and returns only the row's id.
CREATE FUNCTION app_save_customer(buyer_phone text, buyer_name text, buyer_area "DeliveryArea", buyer_district text, buyer_province text, buyer_landmark text)
  RETURNS uuid
  LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
  AS $$
  DECLARE saved_id uuid;
  BEGIN
    IF app_public_store() IS NULL THEN RAISE EXCEPTION 'no public store chosen'; END IF;
    INSERT INTO customers (store_id, phone, name, area, district_id, province_id, landmark)
    VALUES (app_public_store(), buyer_phone, buyer_name, buyer_area, buyer_district, buyer_province, coalesce(buyer_landmark, ''))
    ON CONFLICT (store_id, phone) DO UPDATE
      SET name = EXCLUDED.name, area = EXCLUDED.area, district_id = EXCLUDED.district_id,
          province_id = EXCLUDED.province_id, landmark = EXCLUDED.landmark, updated_at = now()
    RETURNING id INTO saved_id;
    RETURN saved_id;
  END $$;
REVOKE ALL ON FUNCTION app_save_customer(text, text, "DeliveryArea", text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_save_customer(text, text, "DeliveryArea", text, text, text) TO khmer_micro_store_app;

-- The same checkout sent twice: the token of the order its key already made in the buyer's store, if any.
-- The key is a random value only that buyer's browser knows.
CREATE FUNCTION app_order_token_by_key(key uuid) RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT public_token FROM orders WHERE store_id = app_public_store() AND idempotency_key = key $$;
REVOKE ALL ON FUNCTION app_order_token_by_key(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_order_token_by_key(uuid) TO khmer_micro_store_app;

-- Which store an order link belongs to, so the buyer's order page can be read as that store's buyer.
CREATE FUNCTION app_store_id_by_order_token(token text) RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT store_id FROM orders WHERE public_token = token $$;
REVOKE ALL ON FUNCTION app_store_id_by_order_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_store_id_by_order_token(text) TO khmer_micro_store_app;
