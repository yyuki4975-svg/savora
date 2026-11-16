import { loadPublishedDiscoveryCatalog, type DiscoveryRecipe } from "../../../lib/api/published-discovery";
import { RelatedRecipesView, type RelatedRecipe } from "./related-recipes-view";

// Ingredient words too common to say anything about a dish.
const commonIngredients = new Set(["salt", "water", "pepper", "black pepper", "oil", "olive oil", "vegetable oil", "sugar", "butter", "garlic", "onion", "flour", "egg", "eggs"]);

function ingredientSet(recipe: DiscoveryRecipe) {
  return new Set(recipe.ingredients.map((item) => item.toLocaleLowerCase("en").trim()).filter((item) => item && !commonIngredients.has(item)));
}

/**
 * "Keep cooking": published recipes from the same place first, then those sharing the most
 * distinctive ingredients. Added below the recipe sheet; the recipe layout itself is unchanged.
 */
export async function RelatedRecipes({ slug, image }: { slug: string; image: string }) {
  const catalog = await loadPublishedDiscoveryCatalog();
  if (catalog.status !== "ok") return null;
  const current = catalog.recipes.find((recipe) => recipe.slug === slug);
  if (!current) return null;
  const mine = ingredientSet(current);
  const scored = catalog.recipes
    .filter((recipe) => recipe.slug !== slug && recipe.hasPhotography && recipe.image !== image && recipe.image !== current.image)
    .map((recipe) => {
      const sharedPlace = current.countrySlug !== "general" && recipe.countrySlug === current.countrySlug;
      const shared = [...ingredientSet(recipe)].filter((item) => mine.has(item));
      return { recipe, sharedPlace, shared, score: (sharedPlace ? 10 : 0) + shared.length };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.recipe.title.localeCompare(right.recipe.title));
  // One image per recipe card and no repeated photograph on the page.
  const seen = new Set<string>();
  const picks: RelatedRecipe[] = [];
  for (const { recipe, sharedPlace, shared } of scored) {
    if (seen.has(recipe.image)) continue;
    seen.add(recipe.image);
    picks.push({
      slug: recipe.slug,
      title: recipe.title,
      image: recipe.image,
      alt: recipe.alt,
      place: recipe.place || (recipe.countrySlug === "general" ? null : recipe.country),
      minutes: recipe.totalMinutes,
      // Name the city only when both recipes share it; otherwise the shared country is the true reason.
      reason: sharedPlace ? { kind: "place", value: current.place && recipe.place === current.place ? current.place : current.country } : { kind: "ingredient", value: shared.slice(0, 2).join(", ") },
    });
    if (picks.length === 4) break;
  }
  if (!picks.length) return null;
  return <RelatedRecipesView recipes={picks} />;
}
