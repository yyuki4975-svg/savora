import { Logger } from "@nestjs/common";
import type { Pool } from "pg";
import type { DatabaseHealth } from "../../application/catalog/catalog-queries";

/** Equivalent of AddDbContextCheck<SavoraDbContext>: healthy when a connection and trivial query succeed. */
export class PgDatabaseHealth implements DatabaseHealth {
  private readonly logger = new Logger(PgDatabaseHealth.name);

  constructor(private readonly pool: Pool) {}

  async canConnect(): Promise<boolean> {
    try {
      await this.pool.query("SELECT 1");
      return true;
    } catch {
      this.logger.warn("PostgreSQL readiness check failed; sensitive diagnostics suppressed.");
      return false;
    }
  }
}
