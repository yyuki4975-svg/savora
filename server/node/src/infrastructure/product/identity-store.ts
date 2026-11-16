import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { Credentials, IdentityStore } from "../../application/identity/identity";
import type { AccountResponse } from "../../contracts/identity";
import type { MailPurpose } from "../../application/mail/outbox";
import type { ProductConfig } from "./config";
import { enqueueAuthMail } from "./mail-outbox";
import { opaqueToken, tokenHash } from "./crypto";

interface AccountRow { id: string; email: string; display_name: string; role: string; password_hash: string;
  email_verified: boolean; disabled: boolean; credential_version: number }
const accountDto = (row: AccountRow): AccountResponse => ({ id: row.id, email: row.email, displayName: row.display_name, role: row.role });

export class PgIdentityStore implements IdentityStore {
  constructor(private readonly pool: Pool, private readonly config: ProductConfig) {}
  private async transaction<T>(action: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try { await client.query("BEGIN"); const result = await action(client); await client.query("COMMIT"); return result; }
    catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  private async issue(client: PoolClient, account: AccountRow, purpose: MailPurpose): Promise<void> {
    const token = opaqueToken(), digest = tokenHash(token);
    // Latest token only, always bound to the current password generation.
    await client.query(`UPDATE savora_product.action_tokens SET consumed_at=now()
      WHERE account_id=$1 AND purpose=$2 AND consumed_at IS NULL`, [account.id, purpose]);
    const result = await client.query<{ expires_at: Date }>(`INSERT INTO savora_product.action_tokens
      (token_hash,account_id,purpose,credential_version,expires_at)
      VALUES ($1,$2,$3::varchar,$4,now()+CASE WHEN $3::varchar='VerifyEmail' THEN interval '24 hours' ELSE interval '30 minutes' END)
      RETURNING expires_at`, [digest, account.id, purpose, account.credential_version]);
    const expiresAt = result.rows[0]!.expires_at.toISOString();
    const path = purpose === "VerifyEmail" ? "verify-email" : "reset-password";
    await enqueueAuthMail(client, this.config.mailCipher, this.config.origin, `${purpose}:${digest}`,
      { recipient: account.email, purpose, expiresAt, actionUrl: `${this.config.origin}/account/${path}#token=${token}` });
  }
  async register(email: string, displayName: string, passwordHash: string): Promise<void> {
    await this.transaction(async client => {
      // Serialize same-email registrations. Re-registration replaces UNVERIFIED credentials before
      // sending a new token: an attacker's pre-registration password cannot survive a victim's retry.
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 1935767155))", [email]);
      const existing = await client.query<AccountRow>("SELECT * FROM savora_product.accounts WHERE email=$1 FOR UPDATE", [email]);
      let account = existing.rows[0];
      if (account?.email_verified || account?.disabled) return;
      if (account) {
        const updated = await client.query<AccountRow>(`UPDATE savora_product.accounts
          SET password_hash=$2,display_name=$3,credential_version=credential_version+1 WHERE id=$1 RETURNING *`,
        [account.id, passwordHash, displayName]);
        account = updated.rows[0]!;
      } else {
        const inserted = await client.query<AccountRow>(`INSERT INTO savora_product.accounts (id,email,display_name,password_hash)
          VALUES ($1,$2,$3,$4) RETURNING *`, [randomUUID(), email, displayName, passwordHash]);
        account = inserted.rows[0]!;
      }
      await this.issue(client, account, "VerifyEmail");
    });
  }
  async credentials(email: string): Promise<Credentials | null> {
    const result = await this.pool.query<AccountRow>("SELECT * FROM savora_product.accounts WHERE email=$1", [email]);
    const account = result.rows[0];
    return account ? { ...accountDto(account), passwordHash: account.password_hash, verified: account.email_verified, disabled: account.disabled } : null;
  }
  async createSession(accountId: string, expectedPasswordHash: string, digest: string): Promise<string | null> {
    return this.transaction(async client => {
      // Account lock serializes reset/disable with session creation; avoids reset-vs-login TOCTOU.
      const eligible = await client.query(`SELECT id FROM savora_product.accounts WHERE id=$1 AND password_hash=$2
        AND email_verified=true AND disabled=false FOR UPDATE`, [accountId, expectedPasswordHash]);
      if (!eligible.rowCount) return null;
      const result = await client.query<{ expires_at: Date }>(`INSERT INTO savora_product.sessions
        (token_hash,account_id,expires_at) VALUES ($1,$2,now()+interval '7 days') RETURNING expires_at`, [digest, accountId]);
      return result.rows[0]!.expires_at.toISOString();
    });
  }
  async session(digest: string): Promise<{ account: AccountResponse; expiresAt: string } | null> {
    const result = await this.pool.query<AccountRow & { expires_at: Date }>(`WITH touched AS (
      UPDATE savora_product.sessions s SET last_seen_at=now() FROM savora_product.accounts a
      WHERE s.token_hash=$1 AND s.account_id=a.id AND s.expires_at>now() AND s.last_seen_at>now()-interval '24 hours'
      AND a.disabled=false AND a.email_verified=true RETURNING s.account_id,s.expires_at)
      SELECT a.*,t.expires_at FROM touched t JOIN savora_product.accounts a ON a.id=t.account_id`, [digest]);
    const row = result.rows[0];
    return row ? { account: accountDto(row), expiresAt: row.expires_at.toISOString() } : null;
  }
  async revoke(digest: string): Promise<void> {
    await this.pool.query("DELETE FROM savora_product.sessions WHERE token_hash=$1", [digest]);
  }
  async requestAction(email: string, purpose: MailPurpose): Promise<void> {
    await this.transaction(async client => {
      const result = await client.query<AccountRow>("SELECT * FROM savora_product.accounts WHERE email=$1 FOR UPDATE", [email]);
      const account = result.rows[0];
      if (!account || account.disabled || (purpose === "VerifyEmail" ? account.email_verified : !account.email_verified)) return;
      await this.issue(client, account, purpose);
    });
  }
  async consumeAction(digest: string, purpose: MailPurpose, passwordHash?: string): Promise<boolean> {
    return this.transaction(async client => {
      // Lock order is always account -> token, matching issue/register; avoid deadlocks.
      const identity = await client.query<{ account_id: string }>(
        "SELECT account_id FROM savora_product.action_tokens WHERE token_hash=$1 AND purpose=$2", [digest, purpose]);
      const id = identity.rows[0]?.account_id;
      if (!id) return false;
      const accounts = await client.query<AccountRow>("SELECT * FROM savora_product.accounts WHERE id=$1 FOR UPDATE", [id]);
      const account = accounts.rows[0];
      if (!account || account.disabled || (purpose === "ResetPassword" && (!account.email_verified || !passwordHash))) return false;
      const consumed = await client.query(`UPDATE savora_product.action_tokens SET consumed_at=now()
        WHERE token_hash=$1 AND purpose=$2 AND consumed_at IS NULL AND expires_at>now()
        AND credential_version=$3 RETURNING token_hash`, [digest, purpose, account.credential_version]);
      if (!consumed.rowCount) return false;
      if (purpose === "VerifyEmail") {
        await client.query("UPDATE savora_product.accounts SET email_verified=true WHERE id=$1", [id]);
      } else {
        await client.query(`UPDATE savora_product.accounts SET password_hash=$2,credential_version=credential_version+1 WHERE id=$1`, [id, passwordHash]);
        await client.query("DELETE FROM savora_product.sessions WHERE account_id=$1", [id]);
        await client.query("UPDATE savora_product.action_tokens SET consumed_at=now() WHERE account_id=$1 AND consumed_at IS NULL", [id]);
      }
      return true;
    });
  }
}
