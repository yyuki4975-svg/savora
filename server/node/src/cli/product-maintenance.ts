import { Client } from "pg";
import { databaseUrlFromEnvironment } from "../config";
import { migrationStatus } from "../infrastructure/db/migrations";
import { maintainProduct, previewProductRetention, productQueueStatus } from "../infrastructure/product/maintenance";
import { parseMaintenanceArgs, retentionPolicy } from "../application/mail/operations";

async function main(): Promise<void> {
  const { command, apply } = parseMaintenanceArgs(process.argv.slice(2));
  if (command === "policy") { console.log(JSON.stringify({ policy: retentionPolicy, delivery: "NotConfigured" })); return; }
  const client = new Client({ connectionString: databaseUrlFromEnvironment(), connectionTimeoutMillis: 5000,
    application_name: "savora-product-maintenance" });
  try {
    await client.connect();
    await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
      try {
        await client.query("SET LOCAL statement_timeout = '15s'");
        await client.query("SET LOCAL lock_timeout = '2s'");
        if ((await migrationStatus(client)).pending.length) throw new Error("Product migrations are pending.");
        const maintenance = command === "maintain"
          ? await (apply ? maintainProduct(client) : previewProductRetention(client)) : undefined;
        const status = await productQueueStatus(client);
        await client.query("COMMIT");
        console.log(JSON.stringify({ ...status, policy: retentionPolicy,
          ...(maintenance ? { mode: apply ? "Applied" : "DryRun", maintenance } : {}) }));
        if (command === "check" && status.requiresAttention) process.exitCode = 2;
      } catch (error) { await client.query("ROLLBACK"); throw error; }
  } finally { await client.end(); }
}
main().catch(() => {
  console.error("Product maintenance failed. Check migration status, database access and private operator diagnostics.");
  process.exitCode = 1;
});
