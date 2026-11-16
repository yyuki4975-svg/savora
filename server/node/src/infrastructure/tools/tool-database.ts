// Database session for the offline tools: one pg connection in a UTC session, EF's
// "pending migrations" guard, explicit transactions, and .NET-shaped database errors.
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client, DatabaseError } from "pg";
import { DotnetException } from "../../domain/dotnet/errors";
import * as schema from "../db/schema";
import { migrationStatus } from "../db/migrations";

export type ToolDatabase = NodePgDatabase<typeof schema>;

export class ToolSession {
  private constructor(
    readonly client: Client,
    readonly db: ToolDatabase,
  ) {}

  static async open(connectionString: string): Promise<ToolSession> {
    const client = new Client({
      connectionString,
      application_name: "savora-node-tools",
      connectionTimeoutMillis: 15_000,
      // Timestamps are exchanged as UTC text and converted by domain/dotnet/instant.ts.
      options: "-c TimeZone=UTC",
    });
    try {
      await client.connect();
    } catch (error) {
      throw toDotnetDatabaseError(error);
    }
    return new ToolSession(client, drizzle(client, { schema }));
  }

  async close(): Promise<void> {
    await this.client.end();
  }

  /** Offline writes require the reviewed Node migrations and unchanged checksums. */
  async pendingMigrations(): Promise<string[]> {
    return (await migrationStatus(this.client)).pending;
  }

  async query<T>(text: string, values: unknown[] = []): Promise<T[]> {
    try {
      return (await this.client.query(text, values)).rows as T[];
    } catch (error) {
      throw toDotnetDatabaseError(error);
    }
  }

  /** BeginTransaction[(IsolationLevel.Serializable)] ... Commit; any failure rolls back. */
  async transaction<T>(work: () => Promise<T>, isolation: "ReadCommitted" | "Serializable" = "ReadCommitted"): Promise<T> {
    await this.query(isolation === "Serializable" ? "BEGIN ISOLATION LEVEL SERIALIZABLE" : "BEGIN");
    try {
      const result = await work();
      await this.query("COMMIT");
      return result;
    } catch (error) {
      try {
        await this.client.query("ROLLBACK");
      } catch {
        // The original error is the one to report.
      }
      throw error;
    }
  }
}

const REDACTED_DETAIL =
  "Detail redacted as it may contain sensitive data. Specify 'Include Error Detail' in the connection string to include this information.";

/** Npgsql.PostgresException.Message: "{SqlState}: {MessageText}" plus a redacted DETAIL line when the server sent one. */
export function toDotnetDatabaseError(error: unknown): unknown {
  // Drizzle wraps driver errors ("Failed query: ...") and keeps the original as `cause`.
  if (!(error instanceof DatabaseError) && error instanceof Error && error.cause instanceof DatabaseError) {
    return toDotnetDatabaseError(error.cause);
  }
  if (error instanceof DatabaseError && error.code) {
    const detail = error.detail ? `\n\nDETAIL: ${REDACTED_DETAIL}` : "";
    return new DotnetException("Npgsql.PostgresException", `${error.code}: ${error.message}${detail}`);
  }
  return error;
}

/** DbContext.SaveChanges failure: DbUpdateException wrapping the PostgresException. */
export function toSaveChangesError(error: unknown): unknown {
  const converted = error instanceof DotnetException ? error : toDotnetDatabaseError(error);
  if (
    converted instanceof DotnetException &&
    (converted.dotnetType === "Npgsql.PostgresException" || converted.dotnetType === "System.ArgumentException")
  ) {
    return new DotnetException(
      "Microsoft.EntityFrameworkCore.DbUpdateException",
      "An error occurred while saving the entity changes. See the inner exception for details.",
      converted,
    );
  }
  return converted;
}
