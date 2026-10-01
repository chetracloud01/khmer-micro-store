import { withContext, type AppDb } from "@khmer-micro-store/db";
import { storeDetailsSaveSchema, storeSettingsSchema } from "@khmer-micro-store/shared";
import { Body, Controller, Get, Inject, Put, UseGuards } from "@nestjs/common";
import { APP_DB } from "../db";
import { InvalidInputException } from "../errors";
import { isStorePhotoKey } from "../files/photos";
import { FILE_STORAGE, type FileStorage } from "../files/storage";
import { assertStoreWritable, storePlan } from "../merchant/plan";
import { CurrentStore, MerchantStoreGuard, type MerchantStore } from "../merchant/store.guard";

const storeSelect = {
  slug: true,
  name: true,
  businessType: true,
  phone: true,
  area: true,
  description: true,
  logoKey: true,
  usdToKhrRate: true,
  allowCod: true,
  deliveryConfiguredAt: true,
} as const;

/** The shop details page: name, business type, phone, area, description, logo and the (optional) Bakong ID. */
@Controller("store")
@UseGuards(MerchantStoreGuard)
export class StoreController {
  constructor(
    @Inject(APP_DB) private readonly app: AppDb,
    @Inject(FILE_STORAGE) private readonly storage: FileStorage,
  ) {}

  @Get()
  async get(@CurrentStore() context: MerchantStore) {
    return withContext(this.app, context, async (tx) => this.details(tx, context.storeId));
  }

  /** Store settings: the currency buyers see first, the USD to KHR rate, cash on delivery, VAT. */
  @Get("settings")
  async getSettings(@CurrentStore() context: MerchantStore) {
    return withContext(this.app, context, (tx) => this.settings(tx, context.storeId));
  }

  @Put("settings")
  async saveSettings(@CurrentStore() context: MerchantStore, @Body() body: unknown) {
    return withContext(this.app, context, async (tx) => {
      await assertStoreWritable(tx, context.storeId);
      // The rate must sit inside the band the platform allows today — refused on save, never silently clamped at checkout.
      const input = storeSettingsSchema(await this.rateBand(tx)).omit({ onlineStockLocation: true }).parse(body);
      await tx.store.update({ where: { id: context.storeId }, data: input });
      await tx.auditLog.create({
        data: { actorType: "merchant", actorId: context.merchantId, storeId: context.storeId, action: "store.settings_saved", entity: "store", entityId: context.storeId },
      });
      return this.settings(tx, context.storeId);
    });
  }

  @Put()
  async save(@CurrentStore() context: MerchantStore, @Body() body: unknown) {
    const input = storeDetailsSaveSchema.parse(body);
    if (input.logoKey && !isStorePhotoKey(context.storeId, input.logoKey)) throw new InvalidInputException({ logoKey: "photo_required" });
    return withContext(this.app, context, async (tx) => {
      await assertStoreWritable(tx, context.storeId);
      await tx.store.update({
        where: { id: context.storeId },
        data: {
          name: input.shopName,
          businessType: input.businessType,
          phone: input.phone,
          area: input.area,
          description: input.description,
          logoKey: input.logoKey,
        },
      });
      // A Bakong ID is optional: clearing it turns KHQR off for the shop; cash on delivery still works.
      await tx.storePaymentConfig.upsert({
        where: { storeId_provider: { storeId: context.storeId, provider: "bakong_khqr" } },
        create: { storeId: context.storeId, provider: "bakong_khqr", bakongAccountId: input.bakongId || null, enabled: input.bakongId !== "" },
        update: { bakongAccountId: input.bakongId || null, enabled: input.bakongId !== "" },
      });
      await tx.auditLog.create({
        data: { actorType: "merchant", actorId: context.merchantId, storeId: context.storeId, action: "store.details_saved", entity: "store", entityId: context.storeId },
      });
      return this.details(tx, context.storeId);
    });
  }

  private async rateBand(tx: Parameters<Parameters<typeof withContext>[2]>[0]) {
    const platform = await tx.platformSettings.findUniqueOrThrow({ where: { id: 1 }, select: { usdToKhrMin: true, usdToKhrMax: true } });
    return { min: platform.usdToKhrMin, max: platform.usdToKhrMax };
  }

  private async settings(tx: Parameters<Parameters<typeof withContext>[2]>[0], storeId: string) {
    const [store, band] = await Promise.all([
      tx.store.findUniqueOrThrow({ where: { id: storeId }, select: { defaultCurrency: true, usdToKhrRate: true, allowCod: true, vatPercent: true } }),
      this.rateBand(tx),
    ]);
    return { ...store, rateBand: band };
  }

  /** The shop's details, plus what the dashboard needs around them: the plan in force and the setup checklist's facts. */
  private async details(tx: Parameters<Parameters<typeof withContext>[2]>[0], storeId: string) {
    const visible = { deletedAt: null, isVisible: true } as const;
    const [{ usdToKhrRate, allowCod, deliveryConfiguredAt, ...store }, bakong, plan, visibleProducts, productsWithPhoto] = await Promise.all([
      tx.store.findUniqueOrThrow({ where: { id: storeId }, select: storeSelect }),
      tx.storePaymentConfig.findUnique({ where: { storeId_provider: { storeId, provider: "bakong_khqr" } }, select: { bakongAccountId: true } }),
      storePlan(tx, storeId),
      tx.product.count({ where: visible }),
      tx.product.count({ where: { ...visible, photos: { some: {} } } }),
    ]);
    const bakongId = bakong?.bakongAccountId ?? "";
    return {
      ...store,
      logoUrl: store.logoKey ? this.storage.publicUrl(store.logoKey) : null,
      bakongId,
      usdToKhrRate,
      plan: plan.plan,
      paused: plan.paused,
      // The facts packages/shared shop-readiness.ts asks for.
      readiness: { visibleProducts, productsWithPhoto, deliveryConfigured: deliveryConfiguredAt !== null, khqrReady: bakongId !== "", codEnabled: allowCod },
    };
  }
}
