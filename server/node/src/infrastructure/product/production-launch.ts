import { readFileSync } from "node:fs";
import type { AppConfig } from "../../config";

/** Operator-owned, artifact-bound launch receipt; never a browser-supplied flag.
 * Missing/partial evidence keeps the original Production refusal intact.
 * Secrets remain in separate readonly mounts, not this nonsecret receipt. */
export const launchProofs = ["userFlows", "independentEditorial", "databaseRestore", "canonicalCatalog",
  "mailOperations", "trustedClientIp", "dependencyReview", "backupRollback"] as const;
const sha = /^[a-f0-9]{64}$/;
export interface LaunchReceipt {
  version: 1; status: "Approved"; origin: string; database: string; reviewedAt: string;
  backendSourceSha256: string; frontendSourceSha256: string;
  proofs: Record<typeof launchProofs[number], string>;
}
export function validateLaunchReceipt(value: unknown, config: AppConfig, source: string,
  origin: string, purpose: "api" | "mail" = "api", now = Date.now()): LaunchReceipt {
  const receipt = value as LaunchReceipt;
  const fail = () => { throw new Error("Production prerequisites have not been accepted for this artifact."); };
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt) ||
    Object.keys(receipt).sort().join() !== ["version","status","origin","database","reviewedAt","backendSourceSha256","frontendSourceSha256","proofs"].sort().join() ||
    receipt.version !== 1 || receipt.status !== "Approved" || receipt.origin !== "https://cookwsavora.com" ||
    origin !== receipt.origin || receipt.database !== "savora_production" || !sha.test(source) ||
    receipt.backendSourceSha256 !== source || !sha.test(receipt.frontendSourceSha256) ||
    !Number.isFinite(Date.parse(receipt.reviewedAt)) || Date.parse(receipt.reviewedAt) < 0 || Date.parse(receipt.reviewedAt) > now) fail();
  // Owner explicitly approved unchanged-artifact long-term restart on Oct 23.
  // This does not renew the separately dated dependency-risk exception or staging window.
  if (!receipt.proofs || typeof receipt.proofs !== "object" || Array.isArray(receipt.proofs) ||
    Object.keys(receipt.proofs).sort().join() !== [...launchProofs].sort().join() ||
    launchProofs.some(key => typeof receipt.proofs[key] !== "string" || !sha.test(receipt.proofs[key]))) fail();
  const url = new URL(config.databaseUrl);
  if (config.environment !== "Production" || url.hostname !== "db.production.cookwsavora.com" ||
    url.pathname !== "/savora_production" || url.username !== (purpose === "api" ? "savora_product_app" : "savora_mail_worker") ||
    url.searchParams.get("sslmode") !== "verify-full" ||
    url.searchParams.get("sslrootcert") !== "/run/certs/postgres-ca.pem" ||
    config.allowedHosts.some(host => host.includes("*")) || !config.allowedHosts.includes("api.cookwsavora.com") ||
    config.trustProxy !== "172.30.63.1/32") fail();
  return receipt;
}
export function assertProductionLaunch(config: AppConfig, origin: string, purpose: "api" | "mail" = "api",
  env: NodeJS.ProcessEnv = process.env): void {
  if (config.environment !== "Production") return;
  if (env.SAVORA_PRODUCTION_LAUNCH_FILE !== "/run/secrets/production_launch") {
    throw new Error("Product endpoints are staging-only until launch prerequisites are accepted.");
  }
  const raw = readFileSync("/run/secrets/production_launch");
  const build = readFileSync("/app/production-build.json");
  if (raw.length > 16384 || build.length > 4096) throw new Error("Invalid Production acceptance receipt.");
  const source = JSON.parse(build.toString("utf8")) as { sourceSha256?: string };
  validateLaunchReceipt(JSON.parse(raw.toString("utf8")), config, source.sourceSha256 ?? "", origin, purpose);
}
