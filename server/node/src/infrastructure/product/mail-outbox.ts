import { randomInt, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { AuthMail, MailLease, MailQueue, MailFailureReason } from "../../application/mail/outbox";
import { MailCipher } from "./crypto";

export function validateAuthMail(value: unknown, origin: string): AuthMail {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid mail payload.");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).sort().join(",") !== "actionUrl,expiresAt,purpose,recipient" ||
    typeof v.recipient !== "string" || v.recipient.length > 254 || !/^[^\s@\r\n]+@[^\s@\r\n]+\.[^\s@\r\n]+$/.test(v.recipient) ||
    typeof v.purpose !== "string" || !["VerifyEmail", "ResetPassword"].includes(v.purpose) ||
    typeof v.expiresAt !== "string" || !Number.isFinite(Date.parse(v.expiresAt)) ||
    typeof v.actionUrl !== "string" || v.actionUrl.length > 2048) throw new Error("Invalid mail payload.");
  const url = new URL(v.actionUrl);
  const expectedPath = v.purpose === "VerifyEmail" ? "/account/verify-email" : "/account/reset-password";
  if (url.origin !== origin || url.pathname !== expectedPath || url.username || url.password || url.search ||
    !/^#token=[A-Za-z0-9_-]{43}$/.test(url.hash)) throw new Error("Invalid mail action URL.");
  return v as unknown as AuthMail;
}

/** Called with the SAME transaction as account/action-token changes (transactional outbox). */
export async function enqueueAuthMail(client: PoolClient, cipher: MailCipher, origin: string,
  dedupeKey: string, value: AuthMail): Promise<string | null> {
  validateAuthMail(value, origin);
  if (!/^[A-Za-z0-9:_-]{1,128}$/.test(dedupeKey)) throw new Error("Invalid mail deduplication key.");
  const id = randomUUID();
  const result = await client.query<{ id: string }>(`INSERT INTO savora_product.mail_outbox
    (id,dedupe_key,payload,expires_at) VALUES ($1,$2,$3,$4) ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`,
  [id, dedupeKey, cipher.encrypt(id, value), value.expiresAt]);
  return result.rows[0]?.id ?? null;
}

export class PgMailQueue implements MailQueue {
  constructor(private readonly pool: Pool, private readonly cipher: MailCipher, private readonly origin: string) {}

  async claim(): Promise<MailLease | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // Bounded retention scrub, no PII/token content retained in terminal jobs.
      await client.query(`WITH expired AS (SELECT id FROM savora_product.mail_outbox
        WHERE status IN ('Pending','Sending') AND expires_at <= now() ORDER BY expires_at,id
        LIMIT 500 FOR UPDATE SKIP LOCKED)
        UPDATE savora_product.mail_outbox m SET status='Expired',payload=NULL,lease_token=NULL,lease_until=NULL,
        completed_at=now() FROM expired e WHERE m.id=e.id`);
      await client.query(`WITH exhausted AS (SELECT id FROM savora_product.mail_outbox
        WHERE status='Sending' AND lease_until <= now() AND attempts=8 ORDER BY lease_until,id
        LIMIT 500 FOR UPDATE SKIP LOCKED)
        UPDATE savora_product.mail_outbox m SET status='Dead',payload=NULL,lease_token=NULL,lease_until=NULL,
        last_error='LeaseExpired',completed_at=now() FROM exhausted e WHERE m.id=e.id`);
      const leaseToken = randomUUID();
      // PostgreSQL explicitly recommends SKIP LOCKED for queue consumers.
      // https://www.postgresql.org/docs/17/sql-select.html#SQL-FOR-UPDATE-SHARE
      const result = await client.query<{ id: string; attempts: number; expires_at: Date }>(`WITH candidate AS (
        SELECT id FROM savora_product.mail_outbox WHERE attempts < 8 AND expires_at > now()+interval '30 seconds'
        AND ((status='Pending' AND next_attempt_at <= now()) OR (status='Sending' AND lease_until <= now()))
        ORDER BY next_attempt_at,created_at,id LIMIT 1 FOR UPDATE SKIP LOCKED)
        UPDATE savora_product.mail_outbox m SET status='Sending',attempts=attempts+1,
        lease_token=$1,lease_until=now()+interval '60 seconds' FROM candidate c WHERE m.id=c.id
        RETURNING m.id,m.attempts,m.expires_at`, [leaseToken]);
      await client.query("COMMIT");
      const row = result.rows[0];
      return row ? { id: row.id, leaseToken, attempt: row.attempts, expiresAt: row.expires_at.toISOString() } : null;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async read(lease: MailLease): Promise<AuthMail | null> {
    const result = await this.pool.query<{ payload: string }>(`SELECT payload FROM savora_product.mail_outbox
      WHERE id=$1 AND lease_token=$2 AND status='Sending' AND lease_until>now() AND expires_at>now()`,
    [lease.id, lease.leaseToken]);
    const row = result.rows[0];
    return row ? validateAuthMail(this.cipher.decrypt(lease.id, row.payload), this.origin) : null;
  }
  async complete(lease: MailLease): Promise<boolean> {
    const result = await this.pool.query(`UPDATE savora_product.mail_outbox SET status='Sent',payload=NULL,
      lease_token=NULL,lease_until=NULL,last_error=NULL,completed_at=now()
      WHERE id=$1 AND lease_token=$2 AND status='Sending' AND lease_until>now() AND expires_at>now()`,
    [lease.id, lease.leaseToken]);
    return result.rowCount === 1;
  }
  async fail(lease: MailLease, reason: MailFailureReason): Promise<boolean> {
    // Fenced by the DB's current attempt/lease, never by untrusted/stale worker attempt counters.
    const jitterSeconds = randomInt(0, 31);
    const result = await this.pool.query(`UPDATE savora_product.mail_outbox SET
      status=CASE WHEN expires_at<=now() THEN 'Expired' WHEN attempts>=8 OR $3 IN ('InvalidPayload','PermanentDeliveryFailed') THEN 'Dead' ELSE 'Pending' END,
      payload=CASE WHEN expires_at<=now() OR attempts>=8 OR $3 IN ('InvalidPayload','PermanentDeliveryFailed') THEN NULL ELSE payload END,
      completed_at=CASE WHEN expires_at<=now() OR attempts>=8 OR $3 IN ('InvalidPayload','PermanentDeliveryFailed') THEN now() ELSE NULL END,
      next_attempt_at=now()+make_interval(secs=>least(3600,30*power(2,attempts-1)::integer)+$4),
      lease_token=NULL,lease_until=NULL,last_error=$3
      WHERE id=$1 AND lease_token=$2 AND status='Sending' AND lease_until>now()`,
    [lease.id, lease.leaseToken, reason, jitterSeconds]);
    return result.rowCount === 1;
  }
  async summary(): Promise<Record<string, number>> {
    const result = await this.pool.query<{ status: string; count: string }>(
      "SELECT status,count(*)::text FROM savora_product.mail_outbox GROUP BY status ORDER BY status");
    return Object.fromEntries(result.rows.map(row => [row.status, Number(row.count)]));
  }
}
