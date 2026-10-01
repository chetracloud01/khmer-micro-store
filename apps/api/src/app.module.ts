import { Module } from "@nestjs/common";
import { AuthController } from "./auth/auth.controller";
import { SessionGuard } from "./auth/session.guard";
import { CatalogController } from "./catalog/catalog.controller";
import { DbShutdown, dbProviders } from "./db";
import { DeliveryController } from "./delivery/delivery.controller";
import { FilesController } from "./files/files.controller";
import { fileStorageProvider } from "./files/storage";
import { HealthController } from "./health/health.controller";
import { MerchantStoreGuard } from "./merchant/store.guard";
import { OrdersController } from "./orders/orders.controller";
import { ProductsController } from "./products/products.controller";
import { PublicController } from "./public/public.controller";
import { StoreController } from "./store/store.controller";
import { StoresController } from "./stores/stores.controller";

@Module({
  controllers: [
    HealthController,
    AuthController,
    StoresController,
    StoreController,
    CatalogController,
    ProductsController,
    DeliveryController,
    OrdersController,
    FilesController,
    PublicController,
  ],
  providers: [...dbProviders, DbShutdown, fileStorageProvider, SessionGuard, MerchantStoreGuard],
})
export class AppModule {}
