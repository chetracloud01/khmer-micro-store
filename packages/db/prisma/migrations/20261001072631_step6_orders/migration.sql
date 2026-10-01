-- CreateEnum
CREATE TYPE "DispatchRoute" AS ENUM ('driver', 'bus', 'pickup');

-- CreateTable
CREATE TABLE "delivery_dispatches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "route" "DispatchRoute" NOT NULL,
    "driver_id" UUID,
    "driver_name" TEXT NOT NULL DEFAULT '',
    "driver_phone" TEXT NOT NULL DEFAULT '',
    "bus_company" TEXT NOT NULL DEFAULT '',
    "ticket_number" TEXT NOT NULL DEFAULT '',
    "dispatched_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "picked_up_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "failed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_dispatches_order_id_idx" ON "delivery_dispatches"("order_id");

-- CreateIndex
CREATE INDEX "outbox_events_sent_at_available_at_idx" ON "outbox_events"("sent_at", "available_at");

-- AddForeignKey
ALTER TABLE "delivery_dispatches" ADD CONSTRAINT "delivery_dispatches_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_dispatches" ADD CONSTRAINT "delivery_dispatches_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "store_drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =====================================================================
-- Rules Prisma can't express
-- =====================================================================

-- A driver dispatch names the driver; a bus dispatch names the company and the ticket.
ALTER TABLE delivery_dispatches ADD CONSTRAINT delivery_dispatches_route_details CHECK (
  (route <> 'driver' OR (driver_name <> '' AND driver_phone <> ''))
  AND (route <> 'bus' OR (bus_company <> '' AND ticket_number <> ''))
);

-- Only the messages the code knows how to send.
ALTER TABLE outbox_events ADD CONSTRAINT outbox_events_kind_known CHECK (kind IN ('order_placed', 'order_cancelled_by_buyer'));

-- The API writes messages; only the worker (the owner user) marks them sent.
REVOKE UPDATE, DELETE ON outbox_events FROM khmer_micro_store_app;
-- A dispatch is a record: never removed by the API (its times are filled in as the order moves).
REVOKE DELETE ON delivery_dispatches FROM khmer_micro_store_app;

-- =====================================================================
-- Row-level security
-- =====================================================================

ALTER TABLE delivery_dispatches ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON delivery_dispatches
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

-- The buyer's order page shows how their own order was sent (driver, bus ticket).
CREATE POLICY buyer_read ON delivery_dispatches FOR SELECT
  USING (store_id = app_public_store()
         AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.store_id = app_public_store() AND o.public_token = app_order_token()));

ALTER TABLE outbox_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON outbox_events
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

-- Placing an order tells the seller: the buyer may add that one kind of message, for the shop they ordered from.
CREATE POLICY buyer_insert ON outbox_events FOR INSERT
  WITH CHECK (store_id = app_public_store() AND kind = 'order_placed');

-- =====================================================================
-- The buyer cancels their own order
--
-- Only through this function: the buyer has no general right to change an
-- order. It cancels the order whose link the buyer holds, only from the
-- status the API saw (so two taps can't race), only while no money has moved
-- and nothing is packed (packages/shared canBuyerCancel), records the history
-- and tells the seller. Returns false when the order had already moved on.
-- =====================================================================

CREATE FUNCTION app_buyer_cancel_order(expected "OrderStatus") RETURNS boolean
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
    RETURN true;
  END $$;
REVOKE ALL ON FUNCTION app_buyer_cancel_order("OrderStatus") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_buyer_cancel_order("OrderStatus") TO khmer_micro_store_app;
