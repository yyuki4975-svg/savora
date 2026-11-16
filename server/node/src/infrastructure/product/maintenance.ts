import type { Pool, Client } from "pg";
import { retentionPolicy } from "../../application/mail/operations";

/** Aggregate-only observation: never select recipient, payload, tokens, notes or raw errors. */
export async function productQueueStatus(client: Pool | Client) {
  const { rows } = await client.query<{ pending: string; sending: string; sent: string; dead: string; expired: string;
    overdue: string; expired_active: string; stalled: string }>(`SELECT
    count(*) FILTER (WHERE status='Pending')::text AS pending,
    count(*) FILTER (WHERE status='Sending')::text AS sending,
    count(*) FILTER (WHERE status='Sent')::text AS sent,
    count(*) FILTER (WHERE status='Dead')::text AS dead,
    count(*) FILTER (WHERE status='Expired')::text AS expired,
    count(*) FILTER (WHERE status='Pending' AND expires_at>now() AND next_attempt_at<now()-make_interval(secs=>$1))::text AS overdue,
    count(*) FILTER (WHERE status IN ('Pending','Sending') AND expires_at<=now())::text AS expired_active,
    count(*) FILTER (WHERE status='Sending' AND lease_until<=now() AND expires_at>now())::text AS stalled
    FROM savora_product.mail_outbox`, [retentionPolicy.overdueWarningSeconds]);
  const row = rows[0]!;
  const counts = { Pending: Number(row.pending), Sending: Number(row.sending), Sent: Number(row.sent),
    Dead: Number(row.dead), Expired: Number(row.expired) };
  const attention = { overdue: Number(row.overdue), expiredActive: Number(row.expired_active), stalled: Number(row.stalled), dead: counts.Dead };
  return { delivery: "NotConfigured" as const, counts, attention,
    requiresAttention: Object.values(attention).some(count => count > 0) };
}

/** A preview is informational; concurrent workers can change candidates before apply. */
export async function previewProductRetention(client: Pool | Client): Promise<Record<string, number>> {
  const predicates = {
    expiredMail: "SELECT id FROM savora_product.mail_outbox WHERE status IN ('Pending','Sending') AND expires_at<=now()",
    exhaustedMail: "SELECT id FROM savora_product.mail_outbox WHERE status='Sending' AND lease_until<=now() AND attempts=8 AND expires_at>now()",
    terminalMail: "SELECT id FROM savora_product.mail_outbox WHERE status IN ('Sent','Dead','Expired') AND payload IS NULL AND completed_at<now()-interval '30 days' AND expires_at<=now()",
    expiredReceipts: "SELECT key FROM savora_product.write_receipts WHERE expires_at<=now()",
    expiredLimitKeys: "SELECT key FROM savora_product.auth_limits WHERE window_start<now()-interval '1 day'",
    expiredSessions: "SELECT token_hash FROM savora_product.sessions WHERE expires_at<=now() OR last_seen_at<=now()-interval '24 hours'",
    expiredActionTokens: "SELECT token_hash FROM savora_product.action_tokens WHERE expires_at<now()-interval '1 day'",
  };
  const result: Record<string, number> = {};
  for (const [name, select] of Object.entries(predicates)) {
    // SQL is a closed, source-controlled allowlist; no external identifiers/expressions are accepted.
    const { rows } = await client.query<{ count: string }>(`SELECT count(*)::text FROM (${select} LIMIT $1) candidates`, [retentionPolicy.batchSize]);
    result[name] = Number(rows[0]!.count);
  }
  return result;
}

/** Caller owns one transaction/client; batches skip worker-held rows rather than blocking.
 * https://www.postgresql.org/docs/17/sql-select.html#SQL-FOR-UPDATE-SHARE
 * https://node-postgres.com/features/transactions
 * No account, kitchen content, or review audit is deleted by this maintenance operation.
 */
export async function maintainProduct(client: Pool | Client): Promise<Record<string, number>> {
  const expiredMail = await client.query(`WITH expired AS (SELECT id FROM savora_product.mail_outbox
    WHERE status IN ('Pending','Sending') AND expires_at<=now() ORDER BY expires_at,id
    LIMIT 500 FOR UPDATE SKIP LOCKED)
    UPDATE savora_product.mail_outbox m SET status='Expired',payload=NULL,lease_token=NULL,lease_until=NULL,
    completed_at=now() FROM expired e WHERE m.id=e.id`);
  const exhaustedMail = await client.query(`WITH exhausted AS (SELECT id FROM savora_product.mail_outbox
    WHERE status='Sending' AND lease_until<=now() AND attempts=8 ORDER BY lease_until,id
    LIMIT 500 FOR UPDATE SKIP LOCKED)
    UPDATE savora_product.mail_outbox m SET status='Dead',payload=NULL,lease_token=NULL,lease_until=NULL,
    last_error='LeaseExpired',completed_at=now() FROM exhausted e WHERE m.id=e.id`);
  const limits = await client.query(`WITH obsolete AS (SELECT key FROM savora_product.auth_limits
    WHERE window_start<now()-interval '1 day' ORDER BY window_start,key LIMIT 500 FOR UPDATE SKIP LOCKED)
    DELETE FROM savora_product.auth_limits l USING obsolete o WHERE l.key=o.key`);
  const sessions = await client.query(`WITH obsolete AS (SELECT token_hash FROM savora_product.sessions
    WHERE expires_at<=now() OR last_seen_at<=now()-interval '24 hours' ORDER BY expires_at,token_hash
    LIMIT 500 FOR UPDATE SKIP LOCKED)
    DELETE FROM savora_product.sessions s USING obsolete o WHERE s.token_hash=o.token_hash`);
  const tokens = await client.query(`WITH obsolete AS (SELECT token_hash FROM savora_product.action_tokens
    WHERE expires_at<now()-interval '1 day' ORDER BY expires_at,token_hash LIMIT 500 FOR UPDATE SKIP LOCKED)
    DELETE FROM savora_product.action_tokens t USING obsolete o WHERE t.token_hash=o.token_hash`);
  const terminalMail = await client.query(`WITH obsolete AS (SELECT id FROM savora_product.mail_outbox
    WHERE status IN ('Sent','Dead','Expired') AND payload IS NULL
    AND completed_at<now()-interval '30 days' AND expires_at<=now()
    ORDER BY completed_at,id LIMIT 500 FOR UPDATE SKIP LOCKED)
    DELETE FROM savora_product.mail_outbox m USING obsolete o WHERE m.id=o.id`);
  const receipts = await client.query(`WITH obsolete AS (SELECT account_id,scope,key FROM savora_product.write_receipts
    WHERE expires_at<=now() ORDER BY expires_at,account_id,scope,key LIMIT 500 FOR UPDATE SKIP LOCKED)
    DELETE FROM savora_product.write_receipts r USING obsolete o
    WHERE r.account_id=o.account_id AND r.scope=o.scope AND r.key=o.key`);
  return { expiredMail: expiredMail.rowCount ?? 0, exhaustedMail: exhaustedMail.rowCount ?? 0,
    terminalMail: terminalMail.rowCount ?? 0, expiredReceipts: receipts.rowCount ?? 0,
    expiredLimitKeys: limits.rowCount ?? 0, expiredSessions: sessions.rowCount ?? 0, expiredActionTokens: tokens.rowCount ?? 0 };
}
