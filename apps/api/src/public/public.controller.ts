import { withPublicStore, type AppDb } from "@khmer-micro-store/db";
import { shopSlugSchema } from "@khmer-micro-store/shared";
import { Controller, Get, Inject, NotFoundException, Param } from "@nestjs/common";
import { APP_DB } from "../db";
import { FILE_STORAGE, type FileStorage } from "../files/storage";
import { productInclude, toProductDto } from "../products/products";

/**
 * The shop page's data, for anyone with the link — no login. Read as a buyer
 * (withPublicStore): the database itself shows only the store's public face
 * and its visible products.
 */
@Controller("public")
export class PublicController {
  constructor(
    @Inject(APP_DB) private readonly app: AppDb,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  @Get("stores/:slug")
  async store(@Param("slug") slug: string) {
    if (!shopSlugSchema.safeParse(slug).success) throw new NotFoundException();
    const url = (key: string) => this.storage.publicUrl(key);
    const shop = await withPublicStore(this.app, slug, async (tx, storeId) => {
      const [store, categories, products] = await Promise.all([
        tx.store.findUniqueOrThrow({
          where: { id: storeId },
          select: { slug: true, name: true, businessType: true, phone: true, area: true, description: true, logoKey: true, defaultCurrency: true, usdToKhrRate: true },
        }),
        tx.category.findMany({ select: { id: true, nameKm: true, nameEn: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
        tx.product.findMany({ where: { deletedAt: null, isVisible: true }, include: productInclude, orderBy: { createdAt: "desc" } }),
      ]);
      const { logoKey, ...rest } = store;
      return {
        store: { ...rest, logoUrl: logoKey ? url(logoKey) : null },
        categories,
        // Wholesale prices are never shown to buyers.
        products: products.map((product) => toProductDto(product, url)),
      };
    });
    if (!shop) throw new NotFoundException();
    return shop;
  }
}
