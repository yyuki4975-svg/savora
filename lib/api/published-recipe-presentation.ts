import "server-only";

import type { RecipeDetail } from "./savora-client";
import { localImage } from "../media/local-media";

const localMediaPattern = /^images\/[a-z0-9][a-z0-9/_-]*\.(?:png|jpe?g|webp)$/i;
const unsplashQueries = new Set([
  "?auto=format&fit=crop&q=88&w=1200",
  "?auto=format&fit=crop&q=88&w=1400",
]);

export function publishedMediaReferenceUrl(media: RecipeDetail["primaryMedia"]) {
  if (!media) return null;

  if (media.storageKey && localMediaPattern.test(media.storageKey)) {
    return `/${media.storageKey}`;
  }

  if (!media.sourceUrl) return null;
  try {
    const url = new URL(media.sourceUrl);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    if (url.hostname === "upload.wikimedia.org") return localImage(url.href);
    if (url.hostname === "www.themealdb.com") return url.href;
    if (url.hostname === "images.unsplash.com" && /^\/photo-[a-z0-9-]+$/i.test(url.pathname) &&
        unsplashQueries.has(url.search)) return url.href;
    return null;
  } catch {
    return null;
  }
}

export function publishedMediaUrl(recipe: RecipeDetail) {
  return publishedMediaReferenceUrl(recipe.primaryMedia);
}

export function primaryRecipePlace(recipe: RecipeDetail) {
  return recipe.places.find((association) => association.isPrimary) ?? recipe.places[0] ?? null;
}

export function publishedRecipeCategory(recipe: RecipeDetail) {
  const sourceName = recipe.sources[0]?.sourceName ?? "";
  if (sourceName.includes("National Heart, Lung, and Blood Institute")) return "Public-health recipe";

  const ingredients = recipe.ingredients.map((ingredient) => ingredient.name).join(" ");
  if (/fish|salmon|cod|tilapia|shrimp|prawn|seafood/i.test(ingredients)) return "Seafood";
  if (/chicken|turkey/i.test(ingredients)) return "Chicken";
  if (/beef|lamb|pork|guanciale|sausage/i.test(ingredients)) return "Meat";
  if (/pasta|spaghetti|noodle/i.test(ingredients)) return "Pasta";
  return "Reviewed recipe";
}
