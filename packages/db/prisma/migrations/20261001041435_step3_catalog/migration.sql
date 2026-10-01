-- AlterTable
ALTER TABLE "platform_settings" ADD COLUMN     "beta_all_basic" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "brands" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "name_km" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "brand_id" UUID,
    "unit_id" UUID,
    "title_km" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "description_km" TEXT NOT NULL DEFAULT '',
    "description_en" TEXT NOT NULL DEFAULT '',
    "discount_percent" INTEGER,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "label_km" TEXT NOT NULL DEFAULT '',
    "label_en" TEXT NOT NULL DEFAULT '',
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "price_usd_cents" INTEGER,
    "price_khr" INTEGER,
    "wholesale_price_usd_cents" INTEGER,
    "wholesale_price_khr" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "file_key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "brands_store_id_idx" ON "brands"("store_id");

-- CreateIndex
CREATE INDEX "products_store_id_deleted_at_idx" ON "products"("store_id", "deleted_at");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "product_variants"("product_id");

-- CreateIndex
CREATE INDEX "product_photos_product_id_idx" ON "product_photos"("product_id");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_photos" ADD CONSTRAINT "product_photos_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =====================================================================
-- Rules Prisma can't express
-- =====================================================================

-- A discount is a whole percent from 0 to 90 (packages/shared product.ts MAX_DISCOUNT_PERCENT).
ALTER TABLE products ADD CONSTRAINT products_discount_range CHECK (discount_percent IS NULL OR discount_percent BETWEEN 0 AND 90);

-- A variant has a price in at least one currency, and prices are never negative.
ALTER TABLE product_variants ADD CONSTRAINT variants_has_price CHECK (price_usd_cents IS NOT NULL OR price_khr IS NOT NULL);
ALTER TABLE product_variants ADD CONSTRAINT variants_prices_not_negative CHECK (
  coalesce(price_usd_cents, 0) >= 0 AND coalesce(price_khr, 0) >= 0
  AND coalesce(wholesale_price_usd_cents, 0) >= 0 AND coalesce(wholesale_price_khr, 0) >= 0
);

-- A SKU is unique within a store, whatever its case — deleted variants don't count.
CREATE UNIQUE INDEX product_variants_store_sku_live ON product_variants (store_id, upper(sku)) WHERE deleted_at IS NULL;

-- =====================================================================
-- Row-level security: each store's catalog is its own (as in step 2)
-- =====================================================================

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON brands
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON products
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON product_variants
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

ALTER TABLE product_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY store_isolation ON product_photos
  USING (store_id = app_current_store()) WITH CHECK (store_id = app_current_store());

-- =====================================================================
-- Public read: the shop page (no signed-in merchant)
--
-- A buyer may read one store's public face — its name, categories and its
-- visible, not-deleted products — and nothing else: no hidden or deleted
-- products, no other table, no writes. Set per transaction by packages/db
-- withPublicStore(); a store is found by its link with app_store_id_by_slug().
-- =====================================================================

CREATE FUNCTION app_public_store() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.public_store_id', true), '')::uuid $$;

-- Only a store's id, by its public link. SECURITY DEFINER so the lookup works before the store is chosen.
CREATE FUNCTION app_store_id_by_slug(link text) RETURNS uuid
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT id FROM stores WHERE slug = link $$;
REVOKE ALL ON FUNCTION app_store_id_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_store_id_by_slug(text) TO khmer_micro_store_app;

CREATE POLICY public_read ON stores FOR SELECT
  USING (id = app_public_store());

CREATE POLICY public_read ON categories FOR SELECT
  USING (store_id = app_public_store());

CREATE POLICY public_read ON products FOR SELECT
  USING (store_id = app_public_store() AND is_visible AND deleted_at IS NULL);

CREATE POLICY public_read ON product_variants FOR SELECT
  USING (store_id = app_public_store() AND deleted_at IS NULL
         AND EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.is_visible AND p.deleted_at IS NULL));

CREATE POLICY public_read ON product_photos FOR SELECT
  USING (store_id = app_public_store()
         AND EXISTS (SELECT 1 FROM products p WHERE p.id = product_id AND p.is_visible AND p.deleted_at IS NULL));
