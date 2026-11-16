import { createHmac } from "node:crypto";
import type { Pool } from "pg";
import { ProductError } from "../../domain/product-error";
export const PRODUCT_LIMITER = Symbol("ProductRateLimiter");

/** Multi-instance/restart-safe limits. Fixed windows measured by PostgreSQL, keyed by HMAC not raw PII. */
export class PgRateLimiter {
  constructor(private readonly pool: Pool, private readonly key: Buffer) {}
  async consume(scope: string, subject: string, maximum: number, seconds: number): Promise<void> {
    if (!Number.isInteger(maximum) || maximum < 1 || maximum > 9999 || !Number.isInteger(seconds) || seconds < 1 || seconds > 86400) {
      throw new Error("Invalid rate-limit policy.");
    }
    const digest = createHmac("sha256", this.key).update("savora-limit-v1:").update(scope).update("\0").update(subject).digest("hex");
    const result = await this.pool.query<{ count: number }>(`INSERT INTO savora_product.auth_limits (key,window_start,count)
      VALUES ($1,to_timestamp(floor(extract(epoch FROM now())/$2)*$2),1)
      ON CONFLICT (key) DO UPDATE SET
      count=CASE WHEN auth_limits.window_start=excluded.window_start THEN least(auth_limits.count+1,10000) ELSE 1 END,
      window_start=excluded.window_start RETURNING count`, [digest, seconds]);
    if (result.rows[0]!.count > maximum) throw new ProductError(429, "RateLimited", "Too many attempts. Please try again later.");
  }
}
