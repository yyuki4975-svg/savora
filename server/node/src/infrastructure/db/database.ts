import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

export type SavoraDatabase = NodePgDatabase<typeof schema>;

export const DATABASE = Symbol("SavoraDatabase");
export const DATABASE_POOL = Symbol("SavoraDatabasePool");

export function createPool(connectionString: string): Pool {
  const pool = new Pool({
    connectionString,
    application_name: "savora-node-api",
    max: 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    // Timestamps are rendered as UTC text and converted in pg-values.ts.
    options: "-c TimeZone=UTC",
  });
  // Idle-client connection failures must not become uncaught EventEmitter errors. Never log a URL or driver message.
  pool.on("error", () => { console.error("PostgreSQL idle connection failed; the pool will reconnect."); });
  return pool;
}

export function createDatabase(pool: Pool): SavoraDatabase {
  return drizzle(pool, { schema });
}
