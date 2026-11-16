import { createVersion7 as randomUUID } from "../../domain/dotnet/guid";
import type { Pool, PoolClient } from "pg";
import type { CommunityFilter, CommunityInput, CommunityPost, CommunityReply, CommunitySpace, CommunityStore } from "../../application/community/community";
import { ProductError } from "../../domain/product-error";
import { productWrite } from "./product-write";
import { requireCapability } from "../../domain/permissions";

const missing = () => new ProductError(404, "CommunityNotFound", "This conversation is unavailable.");
const select = `p.id,a.display_name AS author,p.space,p.body AS text,r.slug AS recipe_slug,p.created_at,
  (SELECT count(*)::int FROM savora_product.community_marks m WHERE m.post_id=p.id AND m.kind='Helpful') AS helpful,
  (SELECT count(*)::int FROM savora_product.community_replies q JOIN savora_product.accounts qa ON qa.id=q.author_id
   WHERE q.post_id=p.id AND q.hidden=false AND qa.disabled=false) AS reply_count,
  p.author_id=$1 AS mine,
  EXISTS(SELECT 1 FROM savora_product.community_marks m WHERE m.post_id=p.id AND m.account_id=$1 AND m.kind='Helpful') AS liked,
  EXISTS(SELECT 1 FROM savora_product.community_marks m WHERE m.post_id=p.id AND m.account_id=$1 AND m.kind='Saved') AS saved`;
type Row = { id: string; author: string; space: CommunitySpace; text: string; recipe_slug: string | null; created_at: Date;
  helpful: number; reply_count: number; mine: boolean | null; liked: boolean; saved: boolean };
const dto = (r: Row): CommunityPost => ({ id: r.id, author: r.author, space: r.space, text: r.text, recipeSlug: r.recipe_slug,
  createdAt: r.created_at.toISOString(), helpful: r.helpful, replyCount: r.reply_count, mine: Boolean(r.mine), liked: r.liked, saved: r.saved });
export class PgCommunityStore implements CommunityStore {
  constructor(private readonly pool: Pool) {}
  private async visible(client: PoolClient, id: string) {
    const row = (await client.query<{ author_id: string }>(`SELECT p.author_id FROM savora_product.community_posts p
      JOIN savora_product.accounts a ON a.id=p.author_id WHERE p.id=$1 AND p.hidden=false AND a.disabled=false FOR UPDATE OF p`, [id])).rows[0];
    if (!row) throw missing(); return row;
  }
  async feed(actor: string | null, filter: CommunityFilter, after: string | null, limit: number, saved: boolean) {
    if (saved && !actor) throw new ProductError(401, "Unauthenticated", "Sign in to view saved notes.");
    const rows = (await this.pool.query<Row>(`SELECT ${select} FROM savora_product.community_posts p
      JOIN savora_product.accounts a ON a.id=p.author_id LEFT JOIN public.recipes r ON r.id=p.recipe_id AND r.status='Published'
      WHERE p.hidden=false AND a.disabled=false AND ($2::text IS NULL OR p.space=$2) AND ($6::text IS NULL OR r.slug=$6)
      AND ($3::uuid IS NULL OR p.id<$3)
      AND (NOT $5::boolean OR EXISTS(SELECT 1 FROM savora_product.community_marks m WHERE m.post_id=p.id AND m.account_id=$1 AND m.kind='Saved'))
      ORDER BY p.id DESC LIMIT $4`, [actor, filter.space, after, limit + 1, saved, filter.recipeSlug])).rows;
    return { items: rows.slice(0, limit).map(dto), nextCursor: rows.length > limit ? rows[limit - 1]!.id : null };
  }
  create(actor: string, input: CommunityInput, key: string) {
    return productWrite(this.pool, actor, "Contribute", "community:create", key, input, async client => {
      let recipe: string | null = null;
      if (input.recipeSlug) {
        recipe = (await client.query<{ id: string }>("SELECT id FROM public.recipes WHERE slug=$1 AND status='Published'", [input.recipeSlug])).rows[0]?.id ?? null;
        if (!recipe) throw new ProductError(404, "RecipeNotFound", "Recipe not found.");
      }
      const id = randomUUID();
      await client.query("INSERT INTO savora_product.community_posts(id,author_id,space,body,recipe_id) VALUES($1,$2,$3,$4,$5)", [id, actor, input.space, input.text, recipe]);
      const row = (await client.query<Row>(`SELECT ${select} FROM savora_product.community_posts p JOIN savora_product.accounts a ON a.id=p.author_id
        LEFT JOIN public.recipes r ON r.id=p.recipe_id WHERE p.id=$2`, [actor, id])).rows[0]!;
      return dto(row);
    });
  }
  async replies(actor: string | null, id: string, after: string | null, limit: number) {
    const exists = await this.pool.query(`SELECT p.id FROM savora_product.community_posts p JOIN savora_product.accounts a ON a.id=p.author_id
      WHERE p.id=$1 AND p.hidden=false AND a.disabled=false`, [id]);
    if (!exists.rowCount) throw missing();
    const rows = (await this.pool.query<{ id: string; author: string; text: string; created_at: Date; mine: boolean }>(
      `SELECT q.id,a.display_name AS author,q.body AS text,q.created_at,q.author_id=$1 AS mine
       FROM savora_product.community_replies q JOIN savora_product.accounts a ON a.id=q.author_id
       WHERE q.post_id=$2 AND q.hidden=false AND a.disabled=false
       AND EXISTS(SELECT 1 FROM savora_product.community_posts p JOIN savora_product.accounts pa ON pa.id=p.author_id WHERE p.id=q.post_id AND p.hidden=false AND pa.disabled=false)
       AND ($3::uuid IS NULL OR q.id>$3) ORDER BY q.id LIMIT $4`, [actor, id, after, limit + 1])).rows;
    const items = rows.slice(0, limit).map(r => ({ id: r.id, author: r.author, text: r.text, createdAt: r.created_at.toISOString(), mine: Boolean(r.mine) }));
    return { items, nextCursor: rows.length > limit ? items.at(-1)!.id : null };
  }
  reply(actor: string, id: string, text: string, key: string) {
    return productWrite(this.pool, actor, "Contribute", `community:reply:${id}`, key, { text }, async client => {
      await this.visible(client, id);
      const row = (await client.query<{ id: string; created_at: Date }>(
        "INSERT INTO savora_product.community_replies(id,post_id,author_id,body) VALUES($1,$2,$3,$4) RETURNING id,created_at", [randomUUID(), id, actor, text])).rows[0]!;
      const author = (await client.query<{ display_name: string }>("SELECT display_name FROM savora_product.accounts WHERE id=$1", [actor])).rows[0]!.display_name;
      return { id: row.id, author, text, createdAt: row.created_at.toISOString(), mine: true } satisfies CommunityReply;
    });
  }
  mark(actor: string, id: string, kind: "Helpful" | "Saved", active: boolean, key: string) {
    return productWrite(this.pool, actor, "Contribute", `community:${kind}:${id}`, key, { active }, async client => {
      await this.visible(client, id);
      if (active) await client.query("INSERT INTO savora_product.community_marks(post_id,account_id,kind) VALUES($1,$2,$3) ON CONFLICT DO NOTHING", [id, actor, kind]);
      else await client.query("DELETE FROM savora_product.community_marks WHERE post_id=$1 AND account_id=$2 AND kind=$3", [id, actor, kind]);
      return { active };
    });
  }
  report(actor: string, id: string, reason: string, key: string) {
    return productWrite(this.pool, actor, "Contribute", `community:report:${id}`, key, { reason }, async client => {
      await this.visible(client, id);
      await client.query(`INSERT INTO savora_product.community_reports(id,post_id,reporter_id,reason) VALUES($1,$2,$3,$4)
        ON CONFLICT(post_id,reporter_id) DO NOTHING`, [randomUUID(), id, actor, reason]);
      return { accepted: true as const };
    });
  }
  remove(actor: string, id: string, key: string) {
    return productWrite(this.pool, actor, "Contribute", `community:remove:${id}`, key, {}, async client => {
      const row = await this.visible(client, id);
      if (row.author_id !== actor) throw missing();
      await client.query("UPDATE savora_product.community_posts SET hidden=true WHERE id=$1", [id]);
      await client.query("INSERT INTO savora_product.community_events(id,post_id,actor_id,action,reason) VALUES($1,$2,$3,'owner-remove','Removed by author')", [randomUUID(), id, actor]);
      return { removed: true as const };
    });
  }
  async reports(actor: string, after: string | null, limit: number) {
    const role = (await this.pool.query<{ role: string }>("SELECT role FROM savora_product.accounts WHERE id=$1 AND disabled=false AND email_verified=true", [actor])).rows[0];
    if (!role) throw new ProductError(401, "Unauthenticated", "Sign in to continue.");
    requireCapability(role.role, "ModerateCommunity");
    const rows = (await this.pool.query<{ id: string; post_id: string; reason: string; created_at: Date; author: string; body: string; space: CommunitySpace; hidden: boolean }>(
      `SELECT q.id,q.post_id,q.reason,q.created_at,a.display_name AS author,p.body,p.space,p.hidden
       FROM savora_product.community_reports q JOIN savora_product.community_posts p ON p.id=q.post_id
       JOIN savora_product.accounts a ON a.id=p.author_id
       WHERE q.resolved_at IS NULL AND ($1::uuid IS NULL OR q.id>$1) ORDER BY q.id LIMIT $2`, [after, limit + 1])).rows;
    return { items: rows.slice(0, limit).map(r => ({ id: r.id, postId: r.post_id, reason: r.reason, createdAt: r.created_at.toISOString(),
      post: {author:r.author,text:r.body,space:r.space,hidden:r.hidden} })), nextCursor: rows.length > limit ? rows[limit - 1]!.id : null };
  }
  moderate(actor: string, id: string, action: "hide" | "dismiss", reason: string, key: string) {
    return productWrite(this.pool, actor, "ModerateCommunity", `community:moderate:${id}`, key, { action, reason }, async client => {
      const report = (await client.query<{ post_id: string }>("SELECT post_id FROM savora_product.community_reports WHERE id=$1 AND resolved_at IS NULL FOR UPDATE", [id])).rows[0];
      if (!report) throw missing();
      if (action === "hide") await client.query("UPDATE savora_product.community_posts SET hidden=true WHERE id=$1", [report.post_id]);
      await client.query("UPDATE savora_product.community_reports SET resolved_at=now() WHERE id=$1", [id]);
      await client.query("INSERT INTO savora_product.community_events(id,post_id,actor_id,action,reason) VALUES($1,$2,$3,$4,$5)", [randomUUID(), report.post_id, actor, action, reason]);
      return { resolved: true as const };
    });
  }
}
