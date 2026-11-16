import { createHash } from "node:crypto";
import type { Client } from "pg";

export const TARGETS = ["zh", "ja", "fr", "it", "es"] as const;
export const PROMPT_VERSION = "catalog-v1";
export interface TextUnit { hash: string; kind: string; source: string; recipeContext?: string }
export interface RecipeSource {
  id: string; slug: string; versionId: string; title: string; summary: string; culture: string | null;
  ingredients: Array<{ position: number; name: string; quantity: string | null; unit: string | null; preparationNote: string | null }>;
  steps: Array<{ position: number; title: string | null; instruction: string; durationMinutes: number | null }>;
}
export const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const unitHash = (kind: string, source: string, recipeContext?: string) => sha256(
  recipeContext ? [PROMPT_VERSION, kind, source, recipeContext] : [PROMPT_VERSION, kind, source]);
function fieldContext(recipe: RecipeSource, kind: string, text: string | null, ingredientName?: string): string | undefined {
  // A counted whole egg, scallion stalk and meat portion do not share a natural counter.
  if (kind === "unit" && text?.toLowerCase() === "pieces" && ingredientName) return `Ingredient: ${ingredientName}`;
  // Same spelling, two different foods: do not poison a shared source-text cache.
  // Keep every unrelated paid unit identity unchanged.
  if (kind !== "ingredient" || text?.toLowerCase() !== "mincemeat") return undefined;
  return `Recipe: ${recipe.title}\nIngredients: ${recipe.ingredients.map(i => i.name).join("; ")}\nMethod: ${recipe.steps.slice(0, 3).map(s => s.instruction).join(" ")}`.slice(0, 4000);
}
export function recipeFields(recipe: RecipeSource): Array<{ kind: string; text: string | null; recipeContext?: string }> {
  return [{ kind: "title", text: recipe.title }, { kind: "summary", text: recipe.summary }, { kind: "culture", text: recipe.culture },
    ...recipe.ingredients.flatMap(i => [{ kind: "ingredient", text: i.name },
      { kind: "unit", text: i.unit, ...(fieldContext(recipe, "unit", i.unit, i.name) ? { recipeContext: fieldContext(recipe, "unit", i.unit, i.name) } : {}) },
      { kind: "preparation", text: i.preparationNote }]),
    ...recipe.steps.flatMap(s => [{ kind: "stepTitle", text: s.title }, { kind: "instruction", text: s.instruction }])]
    .map(field => ({ ...field, ...(fieldContext(recipe, field.kind, field.text) ? { recipeContext: fieldContext(recipe, field.kind, field.text) } : {}) }));
}
export function uniqueUnits(recipes: RecipeSource[], extras: Array<{ kind: string; text: string }>): TextUnit[] {
  const units = new Map<string, TextUnit>();
  for (const { kind, text, recipeContext } of [...recipes.flatMap(recipeFields), ...extras] as Array<{ kind: string; text: string | null; recipeContext?: string }>) {
    if (!text?.trim() || !/\p{L}/u.test(text)) continue;
    if (text.length > 3000 || /__SAVORA_NUMBER_|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) throw new Error("Unsafe catalog translation input.");
    const hash = unitHash(kind, text, recipeContext); units.set(hash, { hash, kind, source: text, ...(recipeContext ? { recipeContext } : {}) });
  }
  return [...units.values()].sort((a, b) => a.hash.localeCompare(b.hash));
}
export function batchUnits<T extends { source: string }>(units: T[], maxChars = 5000, maxItems = 80): T[][] {
  const batches: T[][] = []; let batch: T[] = [], size = 0;
  for (const unit of units) {
    if (unit.source.length > maxChars) throw new Error("Translation unit exceeds batch capacity.");
    if (batch.length && (size + unit.source.length > maxChars || batch.length >= maxItems)) { batches.push(batch); batch = []; size = 0; }
    batch.push(unit); size += unit.source.length;
  }
  if (batch.length) batches.push(batch);
  return batches;
}
export function batchCatalogUnits<T extends { source: string; recipeContext?: string }>(units: T[], maxChars = 5000, maxItems = 80): T[][] {
  const result: T[][] = []; let ordinary: T[] = [];
  const flush = () => { result.push(...batchUnits(ordinary, maxChars, maxItems)); ordinary = []; };
  for (const unit of units) {
    if (unit.recipeContext) { flush(); result.push(...batchUnits([unit], maxChars, maxItems)); }
    else ordinary.push(unit);
  }
  flush(); return result;
}
export function localizedPayload(recipe: RecipeSource, translated: Map<string, string>) {
  const resolve = (kind: string, text: string | null, ingredientName?: string) => {
    if (!text?.trim() || !/\p{L}/u.test(text)) return text;
    const value = translated.get(unitHash(kind, text, fieldContext(recipe, kind, text, ingredientName)));
    if (!value) throw new Error("Incomplete localization cannot be staged.");
    return value;
  };
  return {
    title: resolve("title", recipe.title), summary: resolve("summary", recipe.summary), culturalNote: resolve("culture", recipe.culture),
    ingredients: recipe.ingredients.map(i => ({ position: i.position, name: resolve("ingredient", i.name),
      unit: resolve("unit", i.unit, i.name), preparationNote: resolve("preparation", i.preparationNote) })),
    steps: recipe.steps.map(s => ({ position: s.position, title: resolve("stepTitle", s.title), instruction: resolve("instruction", s.instruction) })),
  };
}

export async function captureCatalog(client: Client) {
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    const recipes: RecipeSource[] = (await client.query(`SELECT r.id,r.slug,r.current_version_id AS "versionId",
      t.title,t.summary,t.cultural_note AS culture,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('position',i.position,'name',i.name,'quantity',i.quantity::text,'unit',i.unit,'preparationNote',i.preparation_note) ORDER BY i.position)
        FROM recipe_ingredient_lines i WHERE i.recipe_version_id=r.current_version_id),'[]'::jsonb) AS ingredients,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('position',s.position,'title',s.title,'instruction',s.instruction,'durationMinutes',s.duration_minutes) ORDER BY s.position)
        FROM recipe_steps s WHERE s.recipe_version_id=r.current_version_id),'[]'::jsonb) AS steps
      FROM recipes r JOIN recipe_translations t ON t.recipe_version_id=r.current_version_id AND t.locale='en'
      WHERE r.status='Published' ORDER BY r.slug`)).rows;
    const count = Number((await client.query("SELECT count(*) FROM recipes WHERE status='Published'")).rows[0].count);
    if (recipes.length !== count) throw new Error("Published recipe lacks English source.");
    const extras: Array<{ kind: string; text: string }> = (await client.query(`SELECT 'place' AS kind,name AS text FROM place_names WHERE locale='en'
      UNION SELECT 'alt',m.alt_text FROM media_assets m JOIN recipe_media_associations a ON a.media_asset_id=m.id
      JOIN recipes r ON r.id=a.recipe_id WHERE r.status='Published' AND m.rights_status='Verified'`)).rows;
    await client.query("COMMIT");
    const units = uniqueUnits(recipes, extras);
    return { recipes, extras, units, hash: sha256({ recipes, extras: extras.sort((a,b) => a.text.localeCompare(b.text)) }),
      chars: units.reduce((sum, unit) => sum + unit.source.length, 0), targets: TARGETS };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}
