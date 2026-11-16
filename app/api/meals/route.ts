import { balancedCuisineAreas, socialRecipePool } from "../../social-recipe-data";
import { sensoryProfile, sourceAreaFlag } from "../../../lib/api/draft-recipe-presentation";
import {
  primaryRecipePlace,
  publishedMediaUrl,
  publishedRecipeCategory,
} from "../../../lib/api/published-recipe-presentation";
import { getRecipe, listRecipes, type RecipeDetail } from "../../../lib/api/savora-client";

type ExploreMeal = {
  id: string;
  name: string;
  area: string;
  category: string;
  image: string;
  source: string;
  sourceUrl: string;
  platform: string;
  social: false;
  taste: string;
  texture: string;
  origin: string;
  flag: string;
  searchText: string;
};

function normalizeMealName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toExploreMeal(recipe: RecipeDetail): ExploreMeal {
  const image = publishedMediaUrl(recipe);
  const source = recipe.sources[0];
  if (!image || !source) throw new Error(`Published recipe '${recipe.slug}' lacks safe media or source evidence.`);
  const primaryPlace = primaryRecipePlace(recipe);
  const area = primaryPlace?.place.name ?? "Global";
  const category = publishedRecipeCategory(recipe);
  const sensory = sensoryProfile(category);
  const origin = primaryPlace ? `${area} · ${primaryPlace.relationType}` : "No unsupported origin claim";
  const ingredientText = recipe.ingredients.map((ingredient) => ingredient.name).join(" ");
  return {
    id: recipe.slug,
    name: recipe.title,
    area,
    category,
    image,
    source: "Savora PostgreSQL · reviewed publication",
    sourceUrl: source.sourceUrl,
    platform: "Savora",
    social: false,
    ...sensory,
    origin,
    flag: sourceAreaFlag(area),
    searchText: `${recipe.title} ${recipe.summary} ${ingredientText} ${area} ${category} ${sensory.taste} ${sensory.texture} ${origin}`.toLowerCase(),
  };
}

async function getPostgreSqlMeals(): Promise<ExploreMeal[]> {
  const result = await listRecipes("en", 50);
  if (result.status !== "ok") throw new Error("Savora public catalog unavailable");

  const details: RecipeDetail[] = [];
  for (let index = 0; index < result.data.items.length; index += 8) {
    const batch = await Promise.all(
      result.data.items.slice(index, index + 8).map((recipe) => getRecipe(recipe.slug, "en")),
    );
    if (batch.some((item) => item.status !== "ok")) {
      throw new Error("Savora public recipe detail unavailable");
    }
    details.push(...batch.flatMap((item) => item.status === "ok" ? [item.data] : []));
  }

  if (details.length !== result.data.items.length) throw new Error("Savora public catalog changed during loading");
  return details.map(toExploreMeal).sort((a, b) => a.name.localeCompare(b.name));
}

export async function GET() {
  try {
    const baseMeals = await getPostgreSqlMeals();

    const baseCounts = new Map<string, number>();
    baseMeals.forEach((meal) => baseCounts.set(meal.area, (baseCounts.get(meal.area) ?? 0) + 1));
    const maxCount = Math.max(...baseCounts.values(), 0);
    const minimumTarget = Math.ceil(maxCount / 2);
    const additions = balancedCuisineAreas.flatMap((area) => {
      const areaMeals = baseMeals.filter((meal) => meal.area === area);
      const existingNames = new Set(areaMeals.map((meal) => normalizeMealName(meal.name)));
      const needed = Math.max(0, minimumTarget - areaMeals.length);
      return socialRecipePool
        .filter((meal) => meal.area === area && !existingNames.has(normalizeMealName(meal.name)))
        .slice(0, needed);
    });
    const notes = additions.sort((a, b) => a.name.localeCompare(b.name));

    return Response.json(
      {
        meals: baseMeals,
        notes,
        updatedAt: new Date().toISOString(),
        source: "Savora PostgreSQL Published catalog with a separate attributed community-note collection",
        coverage: {
          maxCuisineCount: maxCount,
          minimumTarget,
          balancedCuisineCount: balancedCuisineAreas.length,
          socialRecipesAdded: additions.length,
          recipeCount: baseMeals.length,
        },
      },
      { headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=1800" } },
    );
  } catch {
    return Response.json({ meals: [], error: "Recipe source unavailable" }, { status: 503 });
  }
}
