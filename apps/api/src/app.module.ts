import { Module } from "@nestjs/common";
import { DbShutdown, dbPoolProvider } from "./db";
import { HealthController } from "./health/health.controller";

@Module({
  controllers: [HealthController],
  providers: [dbPoolProvider, DbShutdown],
})
export class AppModule {}
