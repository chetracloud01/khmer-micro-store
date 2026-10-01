import "reflect-metadata";
import { EnvError, type ApiEnv } from "@khmer-micro-store/shared";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { getEnv } from "./config";
import { AllErrorsFilter } from "./errors";
import { createLogger, httpLogger } from "./logger";
import { initSentry } from "./sentry";

function readSettings(): ApiEnv {
  try {
    return getEnv();
  } catch (error) {
    if (error instanceof EnvError) {
      // Before the logger exists; names the bad settings, never their values.
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}

async function bootstrap() {
  const env = readSettings();
  const logger = createLogger(env.LOG_LEVEL);
  initSentry(env.SENTRY_DSN, env.NODE_ENV);

  const app = await NestFactory.create(AppModule, { logger: false });
  app.use(httpLogger(logger));
  app.useGlobalFilters(new AllErrorsFilter(logger));
  // Only the web app may call the API from a browser.
  app.enableCors({ origin: env.WEB_ORIGIN, credentials: true });
  app.enableShutdownHooks();

  await app.listen(env.PORT);
  logger.info({ port: env.PORT, environment: env.NODE_ENV }, "API listening");
}

void bootstrap();
