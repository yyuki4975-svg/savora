import { Inject, Injectable, Module, type DynamicModule, type OnApplicationShutdown } from "@nestjs/common";
import type { Pool } from "pg";
import { CatalogController } from "./api/catalog.controller";
import { OperatorController } from "./api/operator.controller";
import { SystemController } from "./api/system.controller";
import { CATALOG_QUERIES, DATABASE_HEALTH } from "./application/catalog/catalog-queries";
import { OPERATOR_CATALOG_QUERIES } from "./application/catalog/operator-queries";
import { APP_CONFIG, type AppConfig } from "./config";
import { DrizzleCatalogQueries } from "./infrastructure/catalog/drizzle-catalog-queries";
import { DrizzleOperatorCatalogQueries } from "./infrastructure/catalog/drizzle-operator-queries";
import { DATABASE, DATABASE_POOL, createDatabase, createPool } from "./infrastructure/db/database";
import { PgDatabaseHealth } from "./infrastructure/db/pg-database-health";
import { IdentityController, PRODUCT_CONFIG } from "./api/identity.controller";
import { IDENTITY, IdentityService } from "./application/identity/identity";
import type { ProductConfig } from "./infrastructure/product/config";
import { PgIdentityStore } from "./infrastructure/product/identity-store";
import { hashPassword, opaqueToken, tokenHash, verifyPassword } from "./infrastructure/product/crypto";
import { KitchenController } from "./api/kitchen.controller";
import { KITCHEN } from "./application/personal-kitchen/kitchen";
import { PgKitchenStore } from "./infrastructure/product/kitchen-store";
import { PRODUCT_LIMITER, PgRateLimiter } from "./infrastructure/product/rate-limiter";
import { SubmissionsController } from "./api/submissions.controller";
import { SUBMISSIONS } from "./application/submissions/submissions";
import { PgSubmissionStore } from "./infrastructure/product/submission-store";
import { TranslationController } from "./api/translation.controller";
import { TRANSLATOR } from "./contracts/translation";
import { OpenRouterTranslator, translationConfig } from "./infrastructure/translation/openrouter";
import { PersistentTranslator } from "./infrastructure/translation/persistent-translator";
import { createHash } from "node:crypto";
import { COMMUNITY } from "./application/community/community";
import { PgCommunityStore } from "./infrastructure/product/community-store";
import { CommunityController } from "./api/community.controller";
import { WORKSPACE } from "./application/personal-kitchen/workspace";
import { PgWorkspaceStore } from "./infrastructure/product/workspace-store";
import { PUBLICATION } from "./application/submissions/publication";
import { PgSubmissionPublication } from "./infrastructure/product/submission-publication";

@Injectable()
class PoolLifecycle implements OnApplicationShutdown {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

@Module({})
export class AppModule {
  static register(config: AppConfig, product?: ProductConfig | null): DynamicModule {
    // MapOperatorCatalogEndpoints() runs only in Development; elsewhere the routes do not exist (404).
    const development = config.environment === "Development";
    return {
      module: AppModule,
      controllers: [...(development ? [SystemController, CatalogController, OperatorController] : [SystemController, CatalogController]),
        ...(product ? [IdentityController, KitchenController, SubmissionsController, CommunityController] : []),
        ...(development ? [TranslationController] : [])],
      providers: [
        { provide: APP_CONFIG, useValue: config },
        { provide: DATABASE_POOL, useFactory: () => createPool(config.databaseUrl) },
        { provide: DATABASE, useFactory: (pool: Pool) => createDatabase(pool), inject: [DATABASE_POOL] },
        { provide: DATABASE_HEALTH, useFactory: (pool: Pool) => new PgDatabaseHealth(pool), inject: [DATABASE_POOL] },
        { provide: CATALOG_QUERIES, useClass: DrizzleCatalogQueries },
        { provide: OPERATOR_CATALOG_QUERIES, useClass: DrizzleOperatorCatalogQueries },
        ...(development ? [{ provide: TRANSLATOR, inject: [DATABASE_POOL], useFactory: (pool: Pool) => {
          const translation = translationConfig();
          const limiter = new PgRateLimiter(pool, createHash("sha256").update(translation?.apiKey ?? "translation-disabled").digest());
          return new PersistentTranslator(pool, new OpenRouterTranslator(translation, fetch, async () => {
            await limiter.consume("translation-minute", "global", 8, 60);
            await limiter.consume("translation-day", "global", 120, 86400);
          }), true); // Public browsing is accepted-cache-only; paid translation remains offline.
        } }] : []),
        ...(product ? [
          { provide: PRODUCT_CONFIG, useValue: product },
          { provide: PRODUCT_LIMITER, inject: [DATABASE_POOL], useFactory: (pool: Pool) => new PgRateLimiter(pool, product.csrfKey) },
          { provide: KITCHEN, inject: [DATABASE_POOL], useFactory: (pool: Pool) => new PgKitchenStore(pool) },
          { provide: WORKSPACE, inject: [DATABASE_POOL], useFactory: (pool: Pool) => new PgWorkspaceStore(pool) },
          { provide: SUBMISSIONS, inject: [DATABASE_POOL], useFactory: (pool: Pool) => new PgSubmissionStore(pool) },
          { provide: PUBLICATION, inject: [DATABASE_POOL], useFactory: (pool: Pool) => new PgSubmissionPublication(pool) },
          { provide: COMMUNITY, inject: [DATABASE_POOL], useFactory: (pool: Pool) => new PgCommunityStore(pool) },
          { provide: IDENTITY, inject: [DATABASE_POOL], useFactory: (pool: Pool) => new IdentityService(
            new PgIdentityStore(pool, product), { hashPassword, verifyPassword, token: opaqueToken, digest: tokenHash }) },
        ] : []),
        PoolLifecycle,
      ],
    };
  }
}
