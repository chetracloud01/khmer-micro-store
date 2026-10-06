import { withContext, type AppDb } from "@khmio/db";
import { deliverySettingsSchema } from "@khmio/shared";
import { Body, Controller, Get, Inject, Put, UseGuards } from "@nestjs/common";
import { APP_DB } from "../db";
import { assertStoreWritable } from "../merchant/plan";
import { CurrentStore, MerchantStoreGuard, type MerchantStore } from "../merchant/store.guard";
import { readDeliverySettings, saveDeliverySettings } from "./delivery";

/** The delivery page (roadmap step 4): Phnom Penh zones and fees, pickup, provinces, drivers. */
@Controller("delivery")
@UseGuards(MerchantStoreGuard)
export class DeliveryController {
  constructor(@Inject(APP_DB) private readonly app: AppDb) {}

  @Get()
  async get(@CurrentStore() context: MerchantStore) {
    return withContext(this.app, context, (tx) => readDeliverySettings(tx, context.storeId));
  }

  @Put()
  async save(@CurrentStore() context: MerchantStore, @Body() body: unknown) {
    const settings = deliverySettingsSchema.parse(body);
    return withContext(this.app, context, async (tx) => {
      await assertStoreWritable(tx, context.storeId);
      await saveDeliverySettings(tx, context.storeId, settings);
      await tx.auditLog.create({
        data: { actorType: "merchant", actorId: context.merchantId, storeId: context.storeId, action: "store.delivery_saved", entity: "store", entityId: context.storeId },
      });
      return readDeliverySettings(tx, context.storeId);
    });
  }
}
