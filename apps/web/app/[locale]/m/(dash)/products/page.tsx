"use client";

import { canAddProduct } from "@khmer-micro-store/shared";
import { Button } from "@khmer-micro-store/ui";
import { ChevronRight, EyeOff, ImageOff, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DataGrid, type DataGridColumn } from "@/components/data-grid";
import { api, ApiError, type Catalog, type Product } from "@/lib/api";
import { priceText, startingVariant, usdValue } from "@/lib/product-price";
import { useMerchant } from "../merchant-context";

// The seller's products, from the API: search, filters, Hidden badge, and
// delete (soft — old orders keep pointing at the product).
export default function ProductsPage() {
  const t = useTranslations("ProductsList");
  const tApp = useTranslations("App");
  const locale = useLocale();
  const router = useRouter();
  const { store, refreshStore } = useMerchant();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [failed, setFailed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Product[]>([]);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = useCallback(() => {
    setFailed(false);
    Promise.all([api<Product[]>("/products"), api<Catalog>("/catalog")])
      .then(([list, names]) => {
        setProducts(list);
        setCatalog(names);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const name = (entry: { nameKm: string; nameEn: string }) => (locale === "km" ? entry.nameKm : entry.nameEn);
  const categoryName = useMemo(() => new Map(catalog?.categories.map((c) => [c.id, locale === "km" ? c.nameKm : c.nameEn])), [catalog, locale]);
  const brandName = useMemo(() => new Map(catalog?.brands.map((b) => [b.id, locale === "km" ? b.nameKm : b.nameEn])), [catalog, locale]);
  const unitName = useMemo(() => new Map(catalog?.units.map((u) => [u.id, locale === "km" ? u.nameKm : u.nameEn])), [catalog, locale]);

  if (failed) {
    return (
      <div className="flex flex-col items-center gap-3 p-4 py-16 text-center" role="alert">
        <p className="font-semibold">{tApp("offlineTitle")}</p>
        <Button variant="primary" onClick={load}>
          {tApp("retry")}
        </Button>
      </div>
    );
  }
  if (!products || !catalog) {
    return (
      <div className="flex flex-col gap-3 p-4" aria-busy="true">
        <span className="sr-only" role="status">
          {tApp("loading")}
        </span>
        {[0, 1, 2].map((key) => (
          <div key={key} className="h-20 animate-pulse rounded-2xl bg-border/40 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  const rate = store.usdToKhrRate;
  const atLimit = !canAddProduct(store.plan, products.length);
  const title = (product: Product) => (locale === "km" ? product.titleKm : product.titleEn || product.titleKm);
  const price = (product: Product) => priceText(startingVariant(product, rate), product.discountPercent);
  const sortPrice = (product: Product) => {
    const variant = startingVariant(product, rate);
    return variant ? usdValue(variant, rate) : 0;
  };

  const thumbnail = (product: Product, size: string) =>
    product.photos[0] ? (
      // eslint-disable-next-line @next/next/no-img-element -- the seller's own uploaded photo
      <img src={product.photos[0].url} alt="" className={`${size} shrink-0 rounded-DEFAULT object-cover`} />
    ) : (
      <div className={`${size} flex shrink-0 items-center justify-center rounded-DEFAULT bg-border/30`} aria-hidden="true">
        <ImageOff className="h-5 w-5 text-muted" />
      </div>
    );
  const hiddenBadge = (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-border/40 px-2 py-0.5 text-xs font-semibold text-muted">
      <EyeOff className="h-3 w-3" aria-hidden="true" />
      {t("hidden")}
    </span>
  );

  const columns: DataGridColumn<Product>[] = [
    {
      key: "product",
      header: t("colProduct"),
      hideable: false,
      sortable: true,
      value: title,
      cell: (product) => (
        <div className="flex items-center gap-3">
          {thumbnail(product, "h-10 w-10")}
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <span className="truncate font-medium">{title(product)}</span>
              {!product.isVisible && hiddenBadge}
            </p>
            {product.hasOptions && <p className="text-xs text-muted">{t("variantsCount", { count: product.variants.length })}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: t("colCategory"),
      sortable: true,
      value: (product) => categoryName.get(product.categoryId) ?? "",
      cell: (product) => categoryName.get(product.categoryId) ?? "—",
    },
    {
      key: "brand",
      header: t("colBrand"),
      sortable: true,
      defaultHidden: true,
      value: (product) => (product.brandId ? (brandName.get(product.brandId) ?? "") : ""),
      cell: (product) => (product.brandId ? (brandName.get(product.brandId) ?? "—") : "—"),
    },
    {
      key: "unit",
      header: t("colUnit"),
      value: (product) => (product.unitId ? (unitName.get(product.unitId) ?? "") : ""),
      cell: (product) => (product.unitId ? (unitName.get(product.unitId) ?? "—") : "—"),
    },
    { key: "price", header: t("colPrice"), align: "right", sortable: true, value: sortPrice, exportValue: price, cell: (product) => <span className="font-medium">{price(product)}</span> },
    {
      key: "discount",
      header: t("colDiscount"),
      align: "right",
      sortable: true,
      value: (product) => product.discountPercent ?? 0,
      cell: (product) =>
        product.discountPercent ? (
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">−{product.discountPercent}%</span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "actions",
      header: t("edit"),
      align: "right",
      hideable: false,
      cell: () => (
        <span className="inline-flex items-center gap-1 font-medium text-brand">
          {t("edit")}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      ),
    },
  ];

  async function deleteProducts(rows: Product[]) {
    setDeleteError(null);
    try {
      for (const product of rows) await api(`/products/${product.id}`, { method: "DELETE" });
    } catch (error) {
      setDeleteError(error instanceof ApiError && error.code === "store_paused" ? tApp("storePaused") : tApp("saveFailed"));
    }
    setPendingDelete([]);
    load();
    void refreshStore();
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("description")}</p>
        </div>
        {atLimit ? (
          <Button variant="primary" disabled>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("addProduct")}
          </Button>
        ) : (
          <Link href={`/${locale}/m/products/new`}>
            <Button variant="primary">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t("addProduct")}
            </Button>
          </Link>
        )}
      </div>

      {atLimit && <p className="rounded-DEFAULT border border-warning/40 bg-warning/5 p-3 text-sm">{tApp("productLimit", { count: products.length })}</p>}
      {deleteError && (
        <p role="alert" className="rounded-DEFAULT border border-danger/40 bg-danger/5 p-3 text-sm text-danger">
          {deleteError}
        </p>
      )}

      <DataGrid
        rows={products}
        getRowId={(product) => product.id}
        columns={columns}
        searchText={(product) => `${product.titleKm} ${product.titleEn} ${product.variants.map((v) => v.sku).join(" ")}`}
        searchPlaceholder={t("searchPlaceholder")}
        chips={[
          { value: "options", label: t("chipWithOptions"), predicate: (product) => product.hasOptions },
          { value: "simple", label: t("chipSimple"), predicate: (product) => !product.hasOptions },
          { value: "discounted", label: t("chipDiscounted"), predicate: (product) => !!product.discountPercent },
          { value: "hidden", label: t("chipHidden"), predicate: (product) => !product.isVisible },
        ]}
        filters={[
          { key: "category", label: t("colCategory"), options: catalog.categories.map((c) => ({ value: c.id, label: name(c) })), predicate: (product, value) => product.categoryId === value },
          { key: "brand", label: t("colBrand"), options: catalog.brands.map((b) => ({ value: b.id, label: name(b) })), predicate: (product, value) => product.brandId === value },
          { key: "unit", label: t("colUnit"), options: catalog.units.map((u) => ({ value: u.id, label: name(u) })), predicate: (product, value) => product.unitId === value },
        ]}
        bulkActions={[{ key: "delete", label: t("deleteSelected"), variant: "danger", run: setPendingDelete }]}
        onRowClick={(product) => router.push(`/${locale}/m/products/${product.id}`)}
        renderCard={(product) => (
          <div className="flex items-center gap-3">
            {thumbnail(product, "h-14 w-14")}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2">
                <span className="truncate font-medium">{title(product)}</span>
                {!product.isVisible && hiddenBadge}
              </p>
              <p className="truncate text-xs text-muted">{categoryName.get(product.categoryId)}</p>
              <p className="mt-1 text-sm font-semibold">
                {price(product)}
                {product.discountPercent ? <span className="ml-2 text-xs font-semibold text-danger">−{product.discountPercent}%</span> : null}
              </p>
            </div>
          </div>
        )}
        exportFileName="products"
        storageKey="products"
        emptyTitle={t("noProducts")}
      />

      <ConfirmDialog
        open={pendingDelete.length > 0}
        title={t("deleteConfirmTitle", { count: pendingDelete.length })}
        body={t("deleteConfirmBody")}
        confirmLabel={t("deleteSelected")}
        cancelLabel={t("cancel")}
        danger
        onConfirm={() => void deleteProducts(pendingDelete)}
        onClose={() => setPendingDelete([])}
      />
    </div>
  );
}
