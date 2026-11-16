import "server-only";
import { getRecipe, isCatalogApiEnabled } from "./savora-client";
import { loadPublishedDiscoveryCatalog } from "./published-discovery";
import { publishedMediaUrl, primaryRecipePlace, publishedRecipeCategory } from "./published-recipe-presentation";
import type { ProfileGalleryResult } from "./profile-gallery";

export async function loadProfileFeatured(): Promise<ProfileGalleryResult> {
  if (!isCatalogApiEnabled()) return { status: "error", message: "Published archive unavailable" };
  const results = await Promise.all(["paella", "bibimbap", "ramen"].map(slug => getRecipe(slug, "en")));
  const recipes = results.flatMap(result => {
    if (result.status !== "ok") return [];
    const recipe = result.data, image = publishedMediaUrl(recipe);
    return image ? [{ slug: recipe.slug, title: recipe.title, image,
      alt: recipe.primaryMedia?.altText ?? recipe.title,
      place: primaryRecipePlace(recipe)?.place.name ?? null, category: publishedRecipeCategory(recipe) }] : [];
  });
  if (recipes.length) return { status: "ok", recipes };
  return results.some(result => result.status === "error")
    ? { status: "error", message: "Published archive unavailable" } : { status: "empty" };
}

// Selection happens on the server, exclusively from the existing Published-only catalog.
export async function loadProfileSavedTiles(slugs: string[]): Promise<ProfileGalleryResult> {
  const catalog = await loadPublishedDiscoveryCatalog();
  if (catalog.status !== "ok") return catalog;
  const wanted = new Set(slugs);
  return { status: "ok", recipes: catalog.recipes.filter(recipe => wanted.has(recipe.slug))
    .map(({ slug, title, image, alt, place, category }) => ({ slug, title, image, alt, place, category })) };
}
