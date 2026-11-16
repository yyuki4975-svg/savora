import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogApiStatus } from "../../catalog-api-status";
import type { CanonicalRecipe } from "../../dish-experience";
import { LocalizedDishExperience } from "../../localized-dish-experience";
import { catalogDishes } from "../../product-data";
import { Footer, Header } from "../../ui";
import { getRecipe, isCatalogApiEnabled, type RecipeDetail } from "../../../lib/api/savora-client";

export const metadata: Metadata = {
  title: "Shoyu Ramen recipe and cultural guide",
  description: "Build a Tokyo-style shoyu ramen bowl with a clear broth, soy tare, springy noodles, and documented cultural context.",
};

function numberValue(value: number | string) {
  return Number(value);
}

function nullableNumberValue(value: number | string | null) {
  return value === null ? null : Number(value);
}

function toCanonicalRecipe(recipe: RecipeDetail): CanonicalRecipe {
  return {
    locale: recipe.locale,
    title: recipe.title,
    summary: recipe.summary,
    culturalNote: recipe.culturalNote,
    version: numberValue(recipe.version),
    servings: numberValue(recipe.servings),
    ingredients: recipe.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: nullableNumberValue(ingredient.quantity),
      unit: ingredient.unit,
      preparationNote: ingredient.preparationNote,
    })),
    steps: recipe.steps.map((step) => ({
      title: step.title,
      instruction: step.instruction,
      durationMinutes: nullableNumberValue(step.durationMinutes),
    })),
    sources: recipe.sources.map((source) => ({
      sourceUrl: source.sourceUrl,
      sourceName: source.sourceName,
    })),
  };
}

export default async function RamenPage() {
  if (!isCatalogApiEnabled()) {
    return (
      <main>
        <Header />
        <CatalogApiStatus
          message="The first-party recipe catalog is paused while the service recovers."
          backHref="/explore"
          backLabel="Return to Explore"
        />
        <Footer />
      </main>
    );
  }

  const result = await getRecipe("ramen", "en");
  if (result.status === "not-found") notFound();
  if (result.status === "error") {
    return (
      <main>
        <Header />
        <CatalogApiStatus message={result.message} backHref="/explore" backLabel="Return to Explore" />
        <Footer />
      </main>
    );
  }

  const dish = catalogDishes.find((item) => item.slug === "ramen");
  if (!dish) notFound();
  const canonicalRecipe = toCanonicalRecipe(result.data);
  const totalMinutes = (nullableNumberValue(result.data.preparationMinutes) ?? 0) + (nullableNumberValue(result.data.cookingMinutes) ?? 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: result.data.title,
    image: [dish.image],
    description: result.data.summary,
    recipeYield: `${canonicalRecipe.servings} servings`,
    totalTime: totalMinutes > 0 ? `PT${totalMinutes}M` : undefined,
    recipeIngredient: canonicalRecipe.ingredients.map((ingredient) => [ingredient.quantity, ingredient.unit, ingredient.name].filter((part) => part !== null && part !== "").join(" ")),
    recipeInstructions: canonicalRecipe.steps.map((step) => ({ "@type": "HowToStep", name: step.title ?? undefined, text: step.instruction })),
  };

  return (
    <main data-catalog-source="api">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Header />
      <LocalizedDishExperience dish={dish} english={result.data} />
      <Footer />
    </main>
  );
}
