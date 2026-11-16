"use client";
import { CookMode, DishExperience, type CanonicalRecipe } from "./dish-experience";
import { useCatalogRecipe } from "./use-catalog-recipe";
import type { CatalogDish } from "./product-data";
import type { RecipeDetail } from "../lib/api/savora-client";

function toCanonical(recipe: RecipeDetail, english: RecipeDetail): CanonicalRecipe {
  return { ...recipe, version: Number(recipe.version), servings: Number(recipe.servings),
    ingredients: recipe.ingredients.map((item, index) => ({ ...item, rawUnit: english.ingredients[index].unit, englishName: english.ingredients[index].name, quantity: item.quantity === null ? null : Number(item.quantity) })),
    steps: recipe.steps.map((step, index) => ({ ...step, englishInstruction: english.steps[index]?.instruction, durationMinutes: step.durationMinutes === null ? null : Number(step.durationMinutes) })) };
}
export function LocalizedDishExperience({ dish, english }: { dish: CatalogDish; english: RecipeDetail }) {
  return <DishExperience dish={dish} canonicalRecipe={toCanonical(useCatalogRecipe(english), english)} />;
}
export function LocalizedCookMode({ dish, english, initialStep }: { dish: CatalogDish; english: RecipeDetail; initialStep: number }) {
  return <CookMode dish={dish} canonicalRecipe={toCanonical(useCatalogRecipe(english), english)} initialStep={initialStep} />;
}
