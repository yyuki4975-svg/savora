import type { RecipeDetailResponse, RecipeDiscoverySummaryResponse } from "../../contracts/catalog";

const object = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const safeText = (value: unknown, nullable = false): boolean => value === null ? nullable : typeof value === "string" && value.length <= 12000 && !/<\/?[a-z][^>]*>/i.test(value);
/** Accepted localized text can replace text only, never quantities, ordering, timers or attribution. */
export function applyCatalogLocalization<T extends RecipeDetailResponse | RecipeDiscoverySummaryResponse>(source: T, value: unknown, acceptedLocale?: string): T {
  const payload = object(value);
  if (!payload || Object.keys(payload).length !== 5 || !safeText(payload.title) || !safeText(payload.summary) ||
    !safeText(payload.culturalNote, true) || !Array.isArray(payload.ingredients) || !Array.isArray(payload.steps)) return source;
  if (payload.ingredients.length !== source.ingredients.length) return source;
  const ingredients = payload.ingredients.map(object), steps = payload.steps.map(object);
  if (ingredients.some((item, index) => !item || Object.keys(item).length !== 4 || item.position !== index + 1 ||
    !safeText(item.name) || !safeText(item.unit, true) || !safeText(item.preparationNote, true)) ||
    steps.some((item,index) => !item || Object.keys(item).length !== 3 || item.position !== index + 1 || !safeText(item.title, true) || !safeText(item.instruction))) return source;
  // An accepted overlay replaces the fallback translation, including its language identity.
  // Invalid/missing overlays still return the original locale above (or below).
  const translated = { ...source, locale: acceptedLocale ?? source.locale, title: payload.title as string, summary: payload.summary as string, culturalNote: payload.culturalNote as string | null };
  if ("steps" in source) {
    if (steps.length !== source.steps.length || source.ingredients.some((item,index) => item.position !== ingredients[index]!.position) ||
      source.steps.some((item,index) => item.position !== steps[index]!.position)) return source;
    return { ...translated,
      ingredients: source.ingredients.map((item,index) => ({ ...item, name: ingredients[index]!.name as string,
        unit: ingredients[index]!.unit as string | null, preparationNote: ingredients[index]!.preparationNote as string | null })),
      steps: source.steps.map((item,index) => ({ ...item, title: steps[index]!.title as string | null, instruction: steps[index]!.instruction as string })),
    } as T;
  }
  return { ...translated, ingredients: ingredients.map(item => item!.name as string) } as T;
}
