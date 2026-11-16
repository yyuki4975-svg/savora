import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { SubmissionContent, SubmissionEvent, SubmissionResponse, SubmissionState } from "../../contracts/submissions";
import { requireReady, reviewTarget, type ReviewAction, type SubmissionStore } from "../../application/submissions/submissions";
import { requireCapability, type Capability } from "../../domain/permissions";
import { ProductError } from "../../domain/product-error";
import { tokenHash } from "./crypto";

interface Row {
  id: string; owner_id: string; reviewer_id: string | null; state: SubmissionState;
  revision: number; version: number; content: SubmissionContent; updated_at: Date;
}
const columns = "id,owner_id,reviewer_id,state,revision,version,content,updated_at";
const dto = (row: Row): SubmissionResponse => ({ id: row.id, state: row.state, revision: row.revision,
  version: row.version, content: row.content, reviewerAssigned: row.reviewer_id !== null, updatedAt: row.updated_at.toISOString() });
const missing = () => new ProductError(404, "SubmissionNotFound", "Submission not found.");
const conflict = () => new ProductError(409, "RevisionConflict", "This submission changed. Refresh before continuing.");
export class PgSubmissionStore implements SubmissionStore {
  constructor(private readonly pool: Pool) {}
  private async publication(items: SubmissionResponse[]) {
    if (!items.length) return items;
    const rows = (await this.pool.query<{ submission_id: string; slug: string; withdrawn: boolean }>(`SELECT p.submission_id,r.slug,p.withdrawn_at IS NOT NULL AS withdrawn
      FROM savora_product.submission_publications p JOIN public.recipes r ON r.id=p.recipe_id WHERE p.submission_id=ANY($1::uuid[])`, [items.map(i => i.id)])).rows;
    return items.map(i => { const p = rows.find(r => r.submission_id === i.id); return {...i,publication:p ? {recipeSlug:p.slug,withdrawn:p.withdrawn} : null}; });
  }
  // One checked-out client per transaction, including receipt, snapshot and audit inserts.
  // https://node-postgres.com/features/transactions
  private async write(actor: string, capability: Capability, scope: string, key: string, input: unknown,
    action: (client: PoolClient) => Promise<SubmissionResponse>): Promise<SubmissionResponse> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN"); await client.query("SET LOCAL statement_timeout = '15s'");
      const account = await client.query<{ role: string }>(`SELECT role FROM savora_product.accounts
        WHERE id=$1 AND disabled=false AND email_verified=true FOR UPDATE`, [actor]);
      if (!account.rows[0]) throw new ProductError(401, "Unauthenticated", "Sign in to continue.");
      requireCapability(account.rows[0].role, capability);
      // Account lock also serializes same-account idempotency and submission quota checks.
      await client.query("DELETE FROM savora_product.write_receipts WHERE account_id=$1 AND scope=$2 AND key=$3 AND expires_at<=now()", [actor, scope, key]);
      const hash = tokenHash(JSON.stringify(input));
      const receipt = await client.query<{ payload_hash: string; response: SubmissionResponse }>(
        "SELECT payload_hash,response FROM savora_product.write_receipts WHERE account_id=$1 AND scope=$2 AND key=$3 FOR UPDATE", [actor, scope, key]);
      if (receipt.rows[0]) {
        if (receipt.rows[0].payload_hash !== hash) throw new ProductError(409, "IdempotencyConflict", "This key was used for a different request.");
        await client.query("COMMIT"); return receipt.rows[0].response;
      }
      const result = await action(client);
      await client.query(`INSERT INTO savora_product.write_receipts(account_id,scope,key,payload_hash,response)
        VALUES ($1,$2,$3,$4,$5::jsonb)`, [actor, scope, key, hash, JSON.stringify(result)]);
      await client.query("COMMIT"); return result;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async list(actor: string, review: boolean, after: string | null, limit: number) {
    const rows = (await this.pool.query<Row>(`SELECT ${columns} FROM savora_product.submissions
      WHERE (($2::boolean AND state IN ('Submitted','InReview','Approved') AND owner_id<>$1
        AND NOT EXISTS(SELECT 1 FROM savora_product.submission_publications p WHERE p.submission_id=submissions.id)) OR (NOT $2::boolean AND owner_id=$1))
      AND ($3::uuid IS NULL OR id>$3) ORDER BY id LIMIT $4`, [actor, review, after, limit + 1])).rows;
    const items = await this.publication(rows.slice(0, limit).map(dto));
    return { items, nextCursor: rows.length > limit ? items.at(-1)!.id : null };
  }
  async detail(actor: string, id: string, review: boolean) {
    const row = (await this.pool.query<Row>(`SELECT ${columns} FROM savora_product.submissions
      WHERE id=$2 AND (owner_id=$1 OR ($3::boolean AND version>0 AND state<>'Draft'))`, [actor, id, review])).rows[0];
    if (!row) throw missing();
    const events = (await this.pool.query<{ revision: number; from_state: SubmissionState | null; to_state: SubmissionState; reason: string | null; created_at: Date }>(
      `SELECT revision,from_state,to_state,reason,created_at FROM savora_product.submission_events
       WHERE submission_id=$1 AND revision<=$2 ORDER BY revision DESC LIMIT 50`, [id, row.revision])).rows.reverse().map(e => ({
        revision: e.revision, from: e.from_state, to: e.to_state, reason: e.reason, createdAt: e.created_at.toISOString(),
      } satisfies SubmissionEvent));
    return { submission: (await this.publication([dto(row)]))[0]!, events };
  }
  private async locked(client: PoolClient, actor: string, id: string, revision: number, owner: boolean): Promise<Row> {
    const row = (await client.query<Row>(`SELECT ${columns} FROM savora_product.submissions
      WHERE id=$1 AND (NOT $3::boolean OR owner_id=$2) FOR UPDATE`, [id, actor, owner])).rows[0];
    if (!row) throw missing();
    if (row.revision !== revision || row.revision >= 2147483647) throw conflict();
    return row;
  }
  private async event(client: PoolClient, actor: string, row: Row, from: SubmissionState | null, reason: string | null) {
    await client.query(`INSERT INTO savora_product.submission_events(submission_id,revision,actor_id,from_state,to_state,reason)
      VALUES($1,$2,$3,$4,$5,$6)`, [row.id, row.revision, actor, from, row.state, reason]);
    return dto(row);
  }
  create(actor: string, content: SubmissionContent, key: string) {
    return this.write(actor, "Contribute", "submission:create", key, content, async client => {
      const quota = await client.query("SELECT id FROM savora_product.submissions WHERE owner_id=$1 LIMIT 200", [actor]);
      if (quota.rows.length >= 200) throw new ProductError(409, "SubmissionQuota", "Contact support before creating more submissions.");
      const row = (await client.query<Row>(`INSERT INTO savora_product.submissions(id,owner_id,content)
        VALUES($1,$2,$3::jsonb) RETURNING ${columns}`, [randomUUID(), actor, JSON.stringify(content)])).rows[0]!;
      return this.event(client, actor, row, null, null);
    });
  }
  edit(actor: string, id: string, content: SubmissionContent, revision: number, key: string) {
    return this.write(actor, "Contribute", `submission:edit:${id}`, key, { content, revision }, async client => {
      const before = await this.locked(client, actor, id, revision, true);
      if (!["Draft", "NeedsChanges"].includes(before.state)) throw new ProductError(409, "LockedSubmission", "Only drafts and returned submissions can be edited.");
      const row = (await client.query<Row>(`UPDATE savora_product.submissions SET content=$2::jsonb,state='Draft',
        reviewer_id=NULL,revision=revision+1,updated_at=now() WHERE id=$1 RETURNING ${columns}`, [id, JSON.stringify(content)])).rows[0]!;
      return this.event(client, actor, row, before.state, null);
    });
  }
  submit(actor: string, id: string, revision: number, key: string) {
    return this.write(actor, "Contribute", `submission:submit:${id}`, key, { revision }, async client => {
      const before = await this.locked(client, actor, id, revision, true);
      if (before.state !== "Draft") throw new ProductError(409, "InvalidTransition", "Save a draft before submitting.");
      requireReady(before.content);
      const row = (await client.query<Row>(`UPDATE savora_product.submissions SET state='Submitted',version=version+1,
        revision=revision+1,updated_at=now() WHERE id=$1 RETURNING ${columns}`, [id])).rows[0]!;
      await client.query("INSERT INTO savora_product.submission_versions(submission_id,version,content) VALUES($1,$2,$3::jsonb)",
        [id, row.version, JSON.stringify(row.content)]);
      return this.event(client, actor, row, before.state, null);
    });
  }
  review(actor: string, id: string, action: ReviewAction, reason: string | null, revision: number, key: string) {
    return this.write(actor, "ReviewRecipe", `submission:review:${id}`, key, { action, reason, revision }, async client => {
      const before = await this.locked(client, actor, id, revision, false);
      if (before.owner_id === actor) throw new ProductError(403, "SelfReview", "Another editor must review this submission.");
      const target = reviewTarget(before.state, action);
      if (action !== "claim" && before.reviewer_id !== actor) throw new ProductError(403, "ReviewOwner", "Only the assigned reviewer can decide this submission.");
      const row = (await client.query<Row>(`UPDATE savora_product.submissions SET state=$2,reviewer_id=$3,
        revision=revision+1,updated_at=now() WHERE id=$1 RETURNING ${columns}`, [id, target, target === "NeedsChanges" ? null : actor])).rows[0]!;
      return this.event(client, actor, row, before.state, reason);
    });
  }
}
