import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { catalogDishes } from "../../product-data";
import { LocalizedDishExperience } from "../../localized-dish-experience";
import { getRecipe, isCatalogApiEnabled } from "../../../lib/api/savora-client";
import { CatalogApiStatus } from "../../catalog-api-status";
import { Footer, Header } from "../../ui";

export async function generateStaticParams() { return catalogDishes.map((dish) => ({ slug: dish.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const dish = catalogDishes.find((item) => item.slug === slug);
  if (!dish) return { title: "Dish not found" };
  return { title: `${dish.name} recipe and cultural guide`, description: `${dish.culturalNote} Learn the ingredients, technique, Cook Mode, video, and regional context.` };
}

export default async function DishPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const dish = catalogDishes.find((item) => item.slug === slug);
  if (!dish) notFound();
  const result = isCatalogApiEnabled() ? await getRecipe(slug, "en") : { status: "error" as const };
  if (result.status === "not-found") notFound();
  if (result.status !== "ok") return <main><Header /><CatalogApiStatus message="The canonical recipe is temporarily unavailable." backHref="/explore" backLabel="Return to Explore" /><Footer /></main>;
  const recipe = result.data;
  const totalMinutes = Number(recipe.preparationMinutes ?? 0) + Number(recipe.cookingMinutes ?? 0);
  const jsonLd = { "@context": "https://schema.org", "@type": "Recipe", name: recipe.title, alternateName: dish.localName, image: [dish.image], description: recipe.summary, recipeCuisine: dish.cuisine,
    totalTime: totalMinutes > 0 ? `PT${totalMinutes}M` : undefined, recipeYield: `${recipe.servings} servings`,
    recipeIngredient: recipe.ingredients.map(item => [item.quantity, item.unit, item.name].filter(part => part !== null && part !== "").join(" ")),
    recipeInstructions: recipe.steps.map(step => ({ "@type": "HowToStep", name: step.title ?? undefined, text: step.instruction })) };
  return <main data-catalog-source="api"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /><Header /><LocalizedDishExperience dish={dish} english={result.data} /><Footer /></main>;
}
