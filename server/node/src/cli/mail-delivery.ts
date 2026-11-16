import { Pool } from "pg";
import { databaseUrlFromEnvironment, loadConfig } from "../config";
import { loadProductConfig } from "../infrastructure/product/config";
import { loadResendConfig, ResendMailTransport } from "../infrastructure/product/resend-transport";
import { PgMailQueue } from "../infrastructure/product/mail-outbox";
import { migrationStatus } from "../infrastructure/db/migrations";
import { runMailOnce } from "../application/mail/outbox";
import { assertMailDeliveryAllowed, parseDeliveryArgs } from "../application/mail/delivery-options";
import { assertProductionLaunch } from "../infrastructure/product/production-launch";

async function main(): Promise<void> {
  const { apply } = parseDeliveryArgs(process.argv.slice(2));
  const provider = loadResendConfig();
  if (!apply) {
    console.log(JSON.stringify({ mode: "ConfigurationOnly", provider: "Resend", configuration: "Valid",
      delivery: "NotTested", networkRequests: 0, queueTouched: false }));
    return;
  }
  assertMailDeliveryAllowed(process.env, () => assertProductionLaunch(loadConfig(), process.env.SAVORA_WEB_ORIGIN ?? "", "mail"));
  const product = loadProductConfig();
  if (!product) throw new Error("Product configuration required.");
  const pool = new Pool({ connectionString: databaseUrlFromEnvironment(), max: 2, connectionTimeoutMillis: 5000,
    statement_timeout: 15_000, query_timeout: 17_000, application_name: "savora-mail-delivery" });
  try {
    const client = await pool.connect();
    try { if ((await migrationStatus(client)).pending.length) throw new Error("Pending migrations."); }
    finally { client.release(); }
    // One attempt per invocation, no background scheduler or hidden POST retries.
    const result = await runMailOnce(new PgMailQueue(pool, product.mailCipher, product.origin), new ResendMailTransport(provider));
    console.log(JSON.stringify({ provider: "Resend", result, meaning: "Provider acceptance is not inbox delivery." }));
    if (!["Delivered", "Idle"].includes(result)) process.exitCode = 2;
  } finally { await pool.end(); }
}
main().catch(() => {
  console.error("Mail delivery command failed. Check private configuration, activation and migration status; diagnostics suppressed.");
  process.exitCode = 1;
});
