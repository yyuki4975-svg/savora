import type { Pool, PoolClient } from "pg";
import type { KitchenStore } from "../../application/personal-kitchen/kitchen";
import type { KitchenEntryResponse, KitchenWrite, KitchenStatus } from "../../contracts/kitchen";
import { ProductError } from "../../domain/product-error";
import { tokenHash } from "./crypto";
import { requireCapability } from "../../domain/permissions";

interface StateRow { slug: string; status: KitchenStatus | null; private_note: string | null; servings: number; revision: string | number; updated_at: Date }
const dto = (row: StateRow): KitchenEntryResponse => ({ recipeSlug: row.slug, status: row.status, privateNote: row.private_note,
  servings: row.servings, revision: Number(row.revision), updatedAt: row.updated_at.toISOString() });

export class PgKitchenStore implements KitchenStore {
  constructor(private readonly pool: Pool) {}
  private async write<T>(accountId: string, scope: string, key: string, digest: string,
    action: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '15s'");
      // Revalidate before both new writes AND receipt replays. Serialize with reset/disable.
      const actor = await client.query<{ role: string }>(`SELECT role FROM savora_product.accounts
        WHERE id=$1 AND disabled=false AND email_verified=true FOR UPDATE`, [accountId]);
      if (!actor.rows[0]) throw new ProductError(401, "Unauthenticated", "Sign in to continue.");
      requireCapability(actor.rows[0].role, "PrivateKitchen");
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 1935767156))", [`${accountId}:${scope}:${key}`]);
      // Expired keys may be reused, but optimistic revision checks still protect the entry.
      await client.query(`DELETE FROM savora_product.write_receipts
        WHERE account_id=$1 AND scope=$2 AND key=$3 AND expires_at<=now()`, [accountId, scope, key]);
      const receipt = await client.query<{ payload_hash: string; response: T }>(`SELECT payload_hash,response FROM savora_product.write_receipts
        WHERE account_id=$1 AND scope=$2 AND key=$3 FOR UPDATE`, [accountId, scope, key]);
      if (receipt.rows[0]) {
        if (receipt.rows[0].payload_hash !== digest) throw new ProductError(409, "IdempotencyConflict", "This key was used for a different request.");
        await client.query("COMMIT"); return receipt.rows[0].response;
      }
      const result = await action(client);
      await client.query(`INSERT INTO savora_product.write_receipts (account_id,scope,key,payload_hash,response)
        VALUES ($1,$2,$3,$4,$5::jsonb)`, [accountId, scope, key, digest, JSON.stringify(result ?? null)]);
      await client.query("COMMIT"); return result;
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }
  async list(accountId: string, after: string | null, limit: number) {
    const result = await this.pool.query<StateRow>(`SELECT r.slug,s.status,s.private_note,s.servings,s.revision,s.updated_at
      FROM savora_product.kitchen_states s JOIN public.recipes r ON r.id=s.recipe_id
      WHERE s.account_id=$1 AND r.status='Published' AND ($2::text IS NULL OR r.slug>$2) ORDER BY r.slug LIMIT $3`, [accountId, after, limit+1]);
    const more = result.rows.length > limit, items = result.rows.slice(0, limit).map(dto);
    return { items, nextCursor: more ? items.at(-1)!.recipeSlug : null };
  }
  async save(accountId: string, slug: string, write: KitchenWrite, key: string): Promise<KitchenEntryResponse> {
    return this.write(accountId, `kitchen:put:${slug}`, key, tokenHash(JSON.stringify(write)), async client => {
      const recipe = await client.query<{ id: string }>("SELECT id FROM public.recipes WHERE slug=$1 AND status='Published'", [slug]);
      const recipeId = recipe.rows[0]?.id;
      if (!recipeId) throw new ProductError(404, "RecipeNotFound", "Recipe not found.");
      let result;
      if (write.expectedRevision === 0) {
        result = await client.query<StateRow>(`INSERT INTO savora_product.kitchen_states
          (account_id,recipe_id,status,private_note,servings,revision)
          VALUES ($1,$2,$3,$4,$5,nextval('savora_product.kitchen_revision'))
          ON CONFLICT (account_id,recipe_id) DO NOTHING
          RETURNING $6::text AS slug,status,private_note,servings,revision,updated_at`,
        [accountId, recipeId, write.status, write.privateNote, write.servings, slug]);
      } else {
        result = await client.query<StateRow>(`UPDATE savora_product.kitchen_states SET status=$3,private_note=$4,
          servings=$5,revision=nextval('savora_product.kitchen_revision'),updated_at=now() WHERE account_id=$1 AND recipe_id=$2 AND revision=$6
          RETURNING $7::text AS slug,status,private_note,servings,revision,updated_at`,
        [accountId, recipeId, write.status, write.privateNote, write.servings, write.expectedRevision, slug]);
      }
      if (!result.rows[0]) throw new ProductError(409, "RevisionConflict", "This entry changed. Refresh before saving.");
      return dto(result.rows[0]);
    });
  }
  async remove(accountId: string, slug: string, expectedRevision: number, key: string): Promise<void> {
    await this.write(accountId, `kitchen:delete:${slug}`, key, tokenHash(JSON.stringify({ expectedRevision })), async client => {
      const result = await client.query(`DELETE FROM savora_product.kitchen_states s USING public.recipes r
        WHERE s.account_id=$1 AND s.recipe_id=r.id AND r.slug=$2 AND s.revision=$3 RETURNING s.recipe_id`,
      [accountId, slug, expectedRevision]);
      if (!result.rowCount) throw new ProductError(409, "RevisionConflict", "This entry changed or no longer exists.");
      return null;
    });
  }
}
