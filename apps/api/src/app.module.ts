import { Module } from "@nestjs/common";
import { AuthController } from "./auth/auth.controller";
import { SessionGuard } from "./auth/session.guard";
import { DbShutdown, dbProviders } from "./db";
import { HealthController } from "./health/health.controller";
import { StoresController } from "./stores/stores.controller";

@Module({
  controllers: [HealthController, AuthController, StoresController],
  providers: [...dbProviders, DbShutdown, SessionGuard],
})
export class AppModule {}
