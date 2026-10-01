import { withContext, type AppDb } from "@khmer-micro-store/db";
import { BUSINESS_TYPE_DEFAULTS, catalogNameSchema } from "@khmer-micro-store/shared";
import { Body, Controller, Get, Inject, Param, Post, UseGuards } from "@nestjs/common";
import { z } from "zod";
import { APP_DB } from "../db";
import { CurrentStore, MerchantStoreGuard, type MerchantStore } from "../merchant/store.guard";
import { assertStoreWritable } from "../merchant/plan";

const kindSchema = z.enum(["categories", "brands", "units"]);
const name = { id: true, nameKm: true, nameEn: true } as const;

/** The lists the product form picks from: categories, brands and units — each store's own. */
@Controller("catalog")
@UseGuards(MerchantStoreGuard)
export class CatalogController {
  constructor(@Inject(APP_DB) private readonly app: AppDb) {}

  @Get()
  async list(@CurrentStore() context: MerchantStore) {
    return withContext(this.app, context, async (tx) => {
      const [store, categories, brands, units] = await Promise.all([
        tx.store.findUniqueOrThrow({ where: { id: context.storeId }, select: { businessType: true } }),
        tx.category.findMany({ select: name, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
        tx.brand.findMany({ select: name, orderBy: { createdAt: "asc" } }),
        tx.unit.findMany({ select: { ...name, key: true }, orderBy: { createdAt: "asc" } }),
      ]);
      // New products start with the business type's own unit (a café's "cup", a salon's "service").
      const defaultUnitKey = BUSINESS_TYPE_DEFAULTS[store.businessType].unitKey;
      return {
        categories,
        brands,
        units: units.map(({ key: _key, ...unit }) => unit),
        defaultUnitId: units.find((unit) => unit.key === defaultUnitKey)?.id ?? units[0]?.id ?? null,
      };
    });
  }

  /** "+ Add new category / brand / unit" in the product form. */
  @Post(":kind")
  async add(@CurrentStore() context: MerchantStore, @Param("kind") kind: string, @Body() body: unknown) {
    const which = kindSchema.parse(kind);
    const input = catalogNameSchema.parse(body);
    return withContext(this.app, context, async (tx) => {
      await assertStoreWritable(tx, context.storeId);
      const data = { storeId: context.storeId, ...input };
      if (which === "categories") return tx.category.create({ data, select: name });
      if (which === "brands") return tx.brand.create({ data, select: name });
      return tx.unit.create({ data, select: name });
    });
  }
}
