import { loadPublishedDiscoveryCatalog, type DiscoveryRecipe } from "../../../../lib/api/published-discovery";
import { loadLocalizedTitles } from "../../../../lib/api/published-discovery-search";
import { cleanIngredient, conceptFor, conceptLabel, rankPantry, readPantry, recipeRequirements, type PantryLocale, type PantryRequirement } from "../../../../lib/search/pantry-match";

// "Cook with what you have" over every published recipe. POST keeps the cook's pantry out of URLs
// and access logs; the list is read for this answer only and never stored.
// https://nextjs.org/docs/app/api-reference/file-conventions/route
const locales: readonly PantryLocale[] = ["en", "zh", "ja", "fr", "it", "es"];
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const problem = (status: number, code: string) => Response.json({ code }, { status, headers });

// Ingredient lines are read once per catalogue refresh (the catalogue itself revalidates every 5 minutes).
let index: { at: number; entries: Array<{ recipe: DiscoveryRecipe; requirements: PantryRequirement[] }> } | null = null;
async function catalogIndex() {
  if (index && Date.now() - index.at < 300_000) return index.entries;
  const catalog = await loadPublishedDiscoveryCatalog().catch(() => null);
  if (!catalog || catalog.status !== "ok") return null;
  index = { at: Date.now(), entries: catalog.recipes.map((recipe) => ({ recipe, requirements: recipeRequirements(recipe.ingredients) })) };
  return index.entries;
}

export async function POST(request: Request) {
  let input: unknown;
  try { input = await request.json(); } catch { return problem(400, "InvalidJson"); }
  const { have, locale: requested } = (input ?? {}) as { have?: unknown; locale?: unknown };
  if (!Array.isArray(have) || have.length > 100 || have.some((item) => typeof item !== "string" || item.length > 160)) return problem(422, "InvalidPantry");
  const locale = locales.includes(requested as PantryLocale) ? requested as PantryLocale : "en";
  const items = (have as string[]).map((item) => item.trim()).filter(Boolean);

  const entries = await catalogIndex();
  if (!entries) return problem(503, "CatalogUnavailable");
  const titles = locale === "en" ? new Map<string, string>() : await loadLocalizedTitles(locale).catch(() => new Map<string, string>());
  const ranked = rankPantry(entries, readPantry(items), 60);

  return Response.json({
    // How each typed item was read, in the same order, so the page can mark unrecognised words.
    recognized: items.map((item) => conceptFor(cleanIngredient(item).phrase || item)?.label[locale] ?? null),
    results: ranked.map(({ recipe, outcome }) => ({
      slug: recipe.slug,
      title: titles.get(recipe.slug) ?? recipe.title,
      image: recipe.image,
      alt: recipe.alt,
      have: outcome.have.map((entry) => conceptLabel(entry, locale)),
      swaps: outcome.swaps.map((swap) => ({ need: conceptLabel(swap.need, locale), use: conceptLabel(swap.use, locale) })),
      missing: outcome.missing.map((requirement) => conceptLabel(requirement.options[0]!, locale)),
      total: outcome.total,
    })),
  }, { headers });
}
