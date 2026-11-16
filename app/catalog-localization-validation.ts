import type { RecipeDetail } from "../lib/api/savora-client";

const safeText = (value: unknown, nullable = false): boolean => value === null ? nullable : typeof value === "string" && value.length <= 12000 && !/<\/?[a-z][^>]*>|__SAVORA_NUMBER_|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/i.test(value);
/** Localized recipe identity, quantities, units' positions and timers must match the English version. */
export function validLocalizedRecipe(english: RecipeDetail, value: unknown, locale: string): value is RecipeDetail {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const recipe = value as RecipeDetail;
  const numberEqual = (a: unknown, b: unknown) => a === null || b === null ? a === b : Number(a) === Number(b);
  return recipe.id === english.id && recipe.slug === english.slug && recipe.locale === locale &&
    numberEqual(recipe.version, english.version) && numberEqual(recipe.servings, english.servings) &&
    numberEqual(recipe.preparationMinutes, english.preparationMinutes) && numberEqual(recipe.cookingMinutes, english.cookingMinutes) &&
    safeText(recipe.title) && safeText(recipe.summary) && safeText(recipe.culturalNote, true) &&
    Array.isArray(recipe.ingredients) && recipe.ingredients.length === english.ingredients.length &&
    recipe.ingredients.every((item, index) => item && item.position === english.ingredients[index].position &&
      numberEqual(item.quantity, english.ingredients[index].quantity) && safeText(item.name) && safeText(item.unit, true) && safeText(item.preparationNote, true)) &&
    Array.isArray(recipe.steps) && recipe.steps.length === english.steps.length &&
    recipe.steps.every((step, index) => step && step.position === english.steps[index].position &&
      numberEqual(step.durationMinutes, english.steps[index].durationMinutes) && safeText(step.title, true) && safeText(step.instruction)) &&
    JSON.stringify(recipe.sources) === JSON.stringify(english.sources);
}
