import type { Pool, PoolClient } from "pg";
import { emptyWorkspace, type KitchenWorkspace, type KitchenImportItem, type WorkspaceStore } from "../../application/personal-kitchen/workspace";
import { ProductError } from "../../domain/product-error";
import { productWrite } from "./product-write";
export class PgWorkspaceStore implements WorkspaceStore {
  constructor(private readonly pool: Pool) {}
  async load(actor: string) {
    const row = (await this.pool.query<{ content: KitchenWorkspace; revision: string }>("SELECT content,revision FROM savora_product.kitchen_documents WHERE account_id=$1", [actor])).rows[0];
    return row ? { content: row.content, revision: Number(row.revision) } : { content: emptyWorkspace(), revision: 0 };
  }
  save(actor: string, content: KitchenWorkspace, revision: number, key: string) {
    return productWrite(this.pool, actor, "PrivateKitchen", "kitchen:workspace", key, { content, revision }, async client => {
      const slugs = [...new Set([...Object.values(content.mealPlan), ...content.collections.flatMap(c => c.recipes), ...content.cookSessions.map(s => s.recipeSlug)])];
      if (slugs.length) {
        const count = (await client.query("SELECT id FROM public.recipes WHERE slug=ANY($1::text[]) AND status='Published'", [slugs])).rowCount;
        if (count !== slugs.length) throw new ProductError(422, "InvalidRecipe", "A recipe is no longer available.");
      }
      for (const session of content.cookSessions) {
        const count = (await client.query<{ count: number }>(`SELECT count(*)::int AS count FROM public.recipe_steps s JOIN public.recipes r ON r.current_version_id=s.recipe_version_id WHERE r.slug=$1`, [session.recipeSlug])).rows[0]!.count;
        if (session.step > count) throw new ProductError(422, "InvalidWorkspace", "The cooking step is outside this recipe.");
      }
      const result = revision === 0
        ? await client.query<{ revision: string }>(`INSERT INTO savora_product.kitchen_documents(account_id,content,revision)
          VALUES($1,$2::jsonb,nextval('savora_product.kitchen_revision')) ON CONFLICT DO NOTHING RETURNING revision`, [actor, JSON.stringify(content)])
        : await client.query<{ revision: string }>(`UPDATE savora_product.kitchen_documents SET content=$2::jsonb,revision=nextval('savora_product.kitchen_revision'),updated_at=now()
          WHERE account_id=$1 AND revision=$3 RETURNING revision`, [actor, JSON.stringify(content), revision]);
      if (!result.rows[0]) throw new ProductError(409, "RevisionConflict", "Kitchen changed. Reload before saving.");
      return { content, revision: Number(result.rows[0].revision) };
    });
  }
  async import(actor: string, items: KitchenImportItem[], apply: boolean, key: string) {
    const operation = async (client: PoolClient) => {
      const result: { recipeSlug: string; decision: "Create" | "KeepServer" | "Unavailable" }[] = [];
      for (const item of items) {
        const recipe = (await client.query<{ id: string }>("SELECT id FROM public.recipes WHERE slug=$1 AND status='Published'", [item.recipeSlug])).rows[0];
        let decision: "Create" | "KeepServer" | "Unavailable" = "Unavailable";
        if (recipe) {
          const exists = (await client.query("SELECT 1 FROM savora_product.kitchen_states WHERE account_id=$1 AND recipe_id=$2", [actor, recipe.id])).rowCount;
          decision = exists ? "KeepServer" : "Create";
          if (apply && !exists) await client.query(`INSERT INTO savora_product.kitchen_states(account_id,recipe_id,status,private_note,servings,revision)
            VALUES($1,$2,$3,$4,$5,nextval('savora_product.kitchen_revision'))`, [actor, recipe.id, item.status, item.privateNote, item.servings]);
        }
        result.push({ recipeSlug: item.recipeSlug, decision });
      }
      return { items: result };
    };
    if (apply) return productWrite(this.pool, actor, "PrivateKitchen", "kitchen:import", key, items, operation);
    const client = await this.pool.connect();
    try { await client.query("BEGIN READ ONLY"); const result = await operation(client); await client.query("COMMIT"); return result; }
    catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }
}
