import type { MetadataRoute } from "next";
import { catalogDishes } from "./product-data";
import { siteUrl } from "./site-url";
import { regionalFoodExhibitions } from "../lib/editorial/regional-food-exhibitions";
import { loadPublishedDiscoveryCatalog } from "../lib/api/published-discovery";

// Rebuilt at most daily; recipes and places come from the published catalog.
export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = ["", "/explore", "/world-map", "/skills", "/stories/autumn-table", "/stories/paella-valenciana", "/community", "/trust", "/share", "/recipe-box", "/meal-planner", "/grocery-list", "/pantry"];
  const entries: MetadataRoute.Sitemap = [
    ...pages.map((path) => ({ url: `${base}${path}`, changeFrequency: path ? "weekly" as const : "daily" as const, priority: path ? .7 : 1 })),
    ...regionalFoodExhibitions.map((exhibition) => ({ url: `${base}/stories/regions/${exhibition.slug}`, changeFrequency: "monthly" as const, priority: .7 })),
    ...catalogDishes.map((dish) => ({ url: `${base}/dishes/${dish.slug}`, changeFrequency: "monthly" as const, priority: .8 })),
  ];
  // Published recipes and their places; the static pages above stay listed if the catalog is unavailable.
  const catalog = await loadPublishedDiscoveryCatalog().catch(() => null);
  if (catalog?.status === "ok") {
    const places = new Set<string>();
    for (const recipe of catalog.recipes) {
      entries.push({ url: `${base}/recipes/${recipe.slug}`, changeFrequency: "monthly", priority: .6 });
      if (recipe.placeSlug) places.add(recipe.placeSlug);
    }
    for (const place of places) entries.push({ url: `${base}/places/${place}`, changeFrequency: "monthly", priority: .5 });
  }
  return entries;
}
