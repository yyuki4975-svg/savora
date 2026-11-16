import { loadPublishedDiscoveryCatalog } from "../../../../lib/api/published-discovery";
import { loadLocalizedSearchText, loadLocalizedTitles } from "../../../../lib/api/published-discovery-search";
import { recipeMatchesIngredientFacet } from "../../../../lib/explore-search";
import { detectIntents, normalize, smartSearch, type SearchLocale } from "../../../../lib/search/smart-search";

// Read-only search suggestions for the Explore and header search boxes. Public catalogue data only; the
// query is not stored or logged. https://nextjs.org/docs/app/api-reference/file-conventions/route
const locales = ["en", "zh", "ja", "fr", "it", "es"] as const;
const headers = { "Cache-Control": "public, max-age=60", "X-Content-Type-Options": "nosniff" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 60);
  const locale = (locales as readonly string[]).includes(url.searchParams.get("locale") ?? "") ? url.searchParams.get("locale") as SearchLocale : "en";
  if (normalize(query).replace(/\s+/g, "").length < 1) return Response.json({ suggestions: [] }, { headers });
  const [catalog, localized, titles] = await Promise.all([
    loadPublishedDiscoveryCatalog().catch(() => null),
    loadLocalizedSearchText().catch(() => new Map<string, string>()),
    locale === "en" ? Promise.resolve(new Map<string, string>()) : loadLocalizedTitles(locale).catch(() => new Map<string, string>()),
  ]);
  if (!catalog || catalog.status !== "ok") return Response.json({ suggestions: [] }, { headers });

  const suggestions: Array<{ kind: "intent" | "recipe" | "country"; label: string; href: string }> = [];
  for (const intent of detectIntents(query).found.slice(0, 2)) {
    suggestions.push({ kind: "intent", label: intent.labels[locale], href: `/explore?q=${encodeURIComponent(intent.labels[locale])}#explore-controls` });
  }
  const typed = normalize(query);
  const countries = new Map<string, string>();
  for (const recipe of catalog.recipes) if (recipe.countrySlug !== "general" && normalize(recipe.country).startsWith(typed)) countries.set(recipe.countrySlug, recipe.country);
  for (const [slug, name] of [...countries].slice(0, 2)) suggestions.push({ kind: "country", label: name, href: `/explore?country=${slug}#explore-controls` });

  const outcome = smartSearch(catalog.recipes.map((recipe) => ({ slug: recipe.slug, title: recipe.title, ingredients: recipe.ingredients, menuCategories: recipe.menuCategories,
    countrySlug: recipe.countrySlug, country: recipe.country, place: recipe.place, totalMinutes: recipe.totalMinutes, text: recipe.keywords.join(" "), localized: localized.get(recipe.slug) })),
  query, (facet, ingredients) => recipeMatchesIngredientFacet(facet, ingredients));
  for (const recipe of outcome.results.slice(0, 8 - suggestions.length)) suggestions.push({ kind: "recipe", label: titles.get(recipe.slug) ?? recipe.title, href: `/recipes/${recipe.slug}` });
  return Response.json({ suggestions }, { headers });
}
