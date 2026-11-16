import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { HttpProblemFilter, hostFiltering, httpsPolicy, methodGuard } from "./api/http-pipeline";
import { AppModule } from "./app.module";
import { loadConfig } from "./config";
import { loadProductConfig } from "./infrastructure/product/config";
import { productPipeline } from "./api/product-pipeline";
import { DATABASE_POOL } from "./infrastructure/db/database";
import { migrationStatus } from "./infrastructure/db/migrations";
import type { Pool } from "pg";
import { PgRateLimiter } from "./infrastructure/product/rate-limiter";
import { translationPipeline } from "./api/translation-pipeline";
import { assertProductionLaunch } from "./infrastructure/product/production-launch";

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const product = loadProductConfig();
  // Formal launch requires a separate operator-owned, source-bound acceptance receipt.
  // Missing evidence still refuses Production; never run the expiring Development fixture publicly.
  if (product) assertProductionLaunch(config, product.origin);
  const app = await NestFactory.create<NestExpressApplication>(AppModule.register(config, product), {
    bodyParser: false,
    logger: ["log", "warn", "error"],
  });

  const express = app.getHttpAdapter().getInstance();
  express.disable("x-powered-by");
  express.set("etag", false);
  if (config.trustProxy !== undefined) express.set("trust proxy", config.trustProxy);

  app.use(hostFiltering(config));
  if (config.environment === "Production") app.use(httpsPolicy(config));
  app.use(methodGuard(config));
  if (config.environment === "Development") app.use("/v1/translate", translationPipeline());
  if (product) {
    const client = await app.get<Pool>(DATABASE_POOL).connect();
    try {
      if ((await migrationStatus(client)).pending.length) throw new Error("Apply reviewed product migrations in a separate deployment step.");
    } catch (error) {
      client.release(); await app.close(); throw error;
    }
    client.release();
    app.use("/v1/auth", productPipeline(product, new PgRateLimiter(app.get<Pool>(DATABASE_POOL), product.csrfKey)));
    app.use("/v1/me/kitchen", productPipeline(product, new PgRateLimiter(app.get<Pool>(DATABASE_POOL), product.csrfKey), "kitchen"));
    app.use("/v1/submissions", productPipeline(product, new PgRateLimiter(app.get<Pool>(DATABASE_POOL), product.csrfKey), "submissions"));
    app.use("/v1/community", productPipeline(product, new PgRateLimiter(app.get<Pool>(DATABASE_POOL), product.csrfKey), "community"));
  }
  app.useGlobalFilters(new HttpProblemFilter());
  app.enableShutdownHooks();

  await app.listen(config.port, config.bindHost);
  new Logger("Savora").log(
    `Savora Node API (${config.environment}) listening on http://${config.bindHost}:${config.port}`,
  );
}

bootstrap().catch(() => {
  // Never print configuration values: the connection string is a secret.
  console.error("Savora Node API failed to start. Check configuration, migration status and private operator diagnostics.");
  process.exitCode = 1;
});
