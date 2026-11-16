import type { Pool, PoolClient } from "pg";
import { ProductError } from "../../domain/product-error";
import { requireCapability, type Capability } from "../../domain/permissions";
import { tokenHash } from "./crypto";

// One client for the resource, idempotency receipt and audit transaction.
// https://node-postgres.com/features/transactions
export async function productWrite<T>(pool: Pool, actor: string, capability: Capability, scope: string,
  key: string, input: unknown, action: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL statement_timeout='15s'");
    const account = (await client.query<{ role: string }>(`SELECT role FROM savora_product.accounts
      WHERE id=$1 AND disabled=false AND email_verified=true FOR UPDATE`, [actor])).rows[0];
    if (!account) throw new ProductError(401, "Unauthenticated", "Sign in to continue.");
    requireCapability(account.role, capability);
    await client.query("DELETE FROM savora_product.write_receipts WHERE account_id=$1 AND scope=$2 AND key=$3 AND expires_at<=now()", [actor, scope, key]);
    const digest = tokenHash(JSON.stringify(input));
    const receipt = (await client.query<{ payload_hash: string; response: T }>(
      "SELECT payload_hash,response FROM savora_product.write_receipts WHERE account_id=$1 AND scope=$2 AND key=$3", [actor, scope, key])).rows[0];
    if (receipt) {
      if (receipt.payload_hash !== digest) throw new ProductError(409, "IdempotencyConflict", "This request key was already used.");
      await client.query("COMMIT"); return receipt.response;
    }
    const result = await action(client);
    await client.query(`INSERT INTO savora_product.write_receipts(account_id,scope,key,payload_hash,response)
      VALUES($1,$2,$3,$4,$5::jsonb)`, [actor, scope, key, digest, JSON.stringify(result)]);
    await client.query("COMMIT"); return result;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}
