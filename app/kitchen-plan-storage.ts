import type { CatalogDish } from "./product-data";
import { curatedRecipeDetails } from "./curated-recipe-details";

export type KitchenPlan = {
  slug: string;
  dish: string;
  image: string;
  servings: number;
  ingredients: { amount: number | null; unit: string; name: string }[];
  equipment: string[];
  updatedAt: string;
};

const storageKey = "savora-kitchen-plans-v1";

export function readKitchenPlans(): KitchenPlan[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as KitchenPlan[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveKitchenPlan(plan: KitchenPlan) {
  if (typeof window === "undefined") return false;
  try {
    const next = [plan, ...readKitchenPlans().filter((item) => item.slug !== plan.slug)];
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event("savora-kitchen-plans-updated"));
    return true;
  } catch { return false; }
}

export function removeKitchenPlan(slug: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(readKitchenPlans().filter((item) => item.slug !== slug)));
    window.dispatchEvent(new Event("savora-kitchen-plans-updated"));
  } catch { /* Device storage is a progressive enhancement. */ }
}

export function planCatalogDish(dish: CatalogDish, servings?: number) {
  saveKitchenPlan(catalogPlan(dish,servings));
}
export function catalogPlan(dish: CatalogDish, servings?: number): KitchenPlan {
  const detail = curatedRecipeDetails[dish.slug];
  const baseServings = detail?.baseServings ?? 2;
  const targetServings = servings ?? baseServings;
  const ratio = targetServings / baseServings;
  return {
    slug: dish.slug,
    dish: dish.name,
    image: dish.image,
    servings: targetServings,
    ingredients: (detail?.ingredients ?? dish.ingredients.map((name) => [null, "", name] as const)).map(([amount, unit, name]) => ({ amount: amount === null ? null : Number((amount * ratio).toFixed(2)), unit, name })),
    equipment: detail?.equipment ?? ["Chef's knife", "Cutting board", "Heavy pan or pot"],
    updatedAt: new Date().toISOString(),
  };
}
