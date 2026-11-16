import { Client } from "pg";
import { adoptBaseline, applyMigrations, migrationStatus } from "../infrastructure/db/migrations";
import { databaseUrlFromEnvironment } from "../config";

async function main() {
  const [command = "status", ...args] = process.argv.slice(2);
  if (!["status", "baseline", "migrate"].includes(command) || args.some(a => a !== "--apply")) {
    throw new Error("Usage: migrate.js status | baseline --apply | migrate --apply");
  }
  if (command !== "status" && !args.includes("--apply")) throw new Error("Database changes require --apply.");
  const client = new Client({ connectionString: databaseUrlFromEnvironment(), connectionTimeoutMillis: 15_000,
    application_name: "savora-migrations", options: "-c TimeZone=UTC" });
  try {
    await client.connect();
    if (command === "baseline") await adoptBaseline(client);
    if (command === "migrate") await applyMigrations(client);
    console.log(JSON.stringify(await migrationStatus(client), null, 2));
  } finally { await client.end(); }
}

main().catch(error => {
  // Driver diagnostics/connection URLs may contain secrets; only our own messages are surfaced.
  const safe = error instanceof Error && !Object.hasOwn(error, "code") && !error.message.includes("postgres:") && !error.message.includes("postgresql:");
  console.error(safe ? error.message : "Database migration command failed; check the connection and database logs.");
  process.exitCode = 1;
});
