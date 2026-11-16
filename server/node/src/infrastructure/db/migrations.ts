import { readFileSync } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import type { Client } from "pg";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

const root = path.resolve(__dirname, "../../../..");
export const migrationsFolder = path.join(root, "migrations");
const lock = 1935767154;

export function catalogMigrations() {
  const journal = JSON.parse(readFileSync(path.join(migrationsFolder, "meta/_journal.json"), "utf8")) as {
    entries: Array<{ idx: number; tag: string; when: number }>;
  };
  let previous = 0;
  for (const [index, entry] of journal.entries.entries()) {
    if (entry.idx !== index || !/^\d{4}_[a-z0-9_]+$/.test(entry.tag) || entry.when <= previous) {
      throw new Error("Invalid or reordered migration journal.");
    }
    previous = entry.when;
  }
  if (journal.entries[0]?.tag !== "0000_catalog_baseline") throw new Error("Catalog baseline is missing.");
  return readMigrationFiles({ migrationsFolder }).map((migration, index) => ({ ...migration, name: journal.entries[index]!.tag }));
}

export async function migrationStatus(client: Client) {
  const migrations = catalogMigrations();
  const exists = (await client.query<{ found: string | null }>("SELECT to_regclass('drizzle.__drizzle_migrations')::text AS found")).rows[0]?.found;
  const applied = exists ? (await client.query<{ hash: string; created_at: string }>(
    'SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, id',
  )).rows : [];
  if (applied.length > migrations.length) throw new Error("Database contains migrations unknown to this backend.");
  applied.forEach((row, index) => {
    const migration = migrations[index]!;
    if (row.hash !== migration.hash || Number(row.created_at) !== migration.folderMillis) {
      throw new Error(`Migration history or checksum mismatch: ${migration.name}.`);
    }
  });
  return { applied: migrations.slice(0, applied.length).map(m => m.name), pending: migrations.slice(applied.length).map(m => m.name) };
}

/** Read-only comparison includes column sizes, constraints, PK names, indexes and RLS. */
export async function verifyBaseline(client: Client): Promise<void> {
  const expected = JSON.parse(readFileSync(path.join(root, "database/baseline-schema.json"), "utf8"));
  const original = JSON.parse(readFileSync(path.join(root, "database/baseline-original-schema.json"), "utf8"));
  const actual = (await client.query(readFileSync(path.join(root, "database/inspect-schema.sql"), "utf8"))).rows[0].schema;
  // pg_dump/restore reparses historical IN/BETWEEN CHECK expression trees. The
  // original and restored whole-schema snapshots differ in exactly nine reviewed
  // deparses; accept either exact snapshot, never strip casts or ignore checks.
  if (!isDeepStrictEqual(actual, expected) && !isDeepStrictEqual(actual, original)) {
    throw new Error("Database schema differs from the reviewed catalog baseline. Refusing adoption.");
  }
  const expectedLegacy = JSON.parse(readFileSync(path.join(root, "database/legacy-migrations.json"), "utf8"));
  const actualLegacy = (await client.query('SELECT "MigrationId", "ProductVersion" FROM public."__EFMigrationsHistory" ORDER BY "MigrationId"')).rows;
  if (!isDeepStrictEqual(actualLegacy, expectedLegacy)) throw new Error("Legacy migration history differs from the reviewed baseline.");
}

/** Record baseline adoption for an existing catalog; no public table or recipe is altered. */
export async function adoptBaseline(client: Client): Promise<void> {
  await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
  try {
    await client.query("SELECT pg_advisory_xact_lock($1)", [lock]);
    const status = await migrationStatus(client);
    if (status.applied.length > 0) {
      // A replay is accepted only while the baseline remains the current schema.
      if (status.applied.length === 1) await verifyBaseline(client);
      await client.query("COMMIT");
      return;
    }
    await verifyBaseline(client);
    await client.query('CREATE SCHEMA IF NOT EXISTS drizzle');
    await client.query('CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)');
    const first = catalogMigrations()[0]!;
    await client.query('INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)', [first.hash, first.folderMillis]);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

/** Explicit deployment action, never called during API startup.
 * https://orm.drizzle.team/docs/migrations#option-4
 */
export async function applyMigrations(client: Client): Promise<void> {
  await client.query("SELECT pg_advisory_lock($1)", [lock]);
  try {
    const status = await migrationStatus(client);
    if (status.applied.length === 0) {
      const { rows } = await client.query("SELECT 1 FROM pg_tables WHERE schemaname = 'public' LIMIT 1");
      if (rows.length) throw new Error("Existing catalog must use db:baseline before db:migrate.");
    }
    // Client, not Pool: every migration statement uses the same connection/transaction.
    await migrate(drizzle(client), { migrationsFolder });
    const after = await migrationStatus(client);
    if (after.pending.length) throw new Error("Migration run left pending migrations.");
  } finally { await client.query("SELECT pg_advisory_unlock($1)", [lock]); }
}
