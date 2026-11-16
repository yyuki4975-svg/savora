import "server-only";

import {
  loadPublishedDiscoveryCatalog,
  type DiscoveryRecipe,
  type PublishedDiscoveryResult,
} from "./published-discovery";
import { countryGeo } from "../geo/country-geo";
import { menuCategories } from "../recipe-menu";

export type PublishedMapRecipe = {
  slug: string;
  title: string;
  summary: string;
  culturalNote: string | null;
  image: string;
  alt: string;
  category: string;
  totalMinutes: number | null;
};

export type PublishedMapPlace = {
  slug: string;
  name: string;
  country: string;
  countrySlug: string;
  area: string;
  flag: string;
  latitude: number;
  longitude: number;
  recipes: PublishedMapRecipe[];
  note: string;
};

/** Every published recipe gathered by country at an approximate country centre (lib/geo/country-geo.ts). */
export type PublishedMapCountry = {
  slug: string;
  name: string;
  flag: string;
  region: string;
  latitude: number;
  longitude: number;
  recipeCount: number;
  categories: string[];
  recipes: PublishedMapRecipe[];
  placeSlugs: string[];
};

export type PublishedMapResult =
  | { status: "ok"; places: PublishedMapPlace[]; countries: PublishedMapCountry[]; unmappedCountries: string[] }
  | { status: "empty" }
  | { status: "error"; message: string };

const countryFlags: Record<string, string> = {
  Brazil: "🇧🇷",
  China: "🇨🇳",
  France: "🇫🇷",
  Greece: "🇬🇷",
  India: "🇮🇳",
  Indonesia: "🇮🇩",
  Italy: "🇮🇹",
  Jamaica: "🇯🇲",
  Japan: "🇯🇵",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Spain: "🇪🇸",
  "South Korea": "🇰🇷",
  Thailand: "🇹🇭",
  "Türkiye": "🇹🇷",
  "United States": "🇺🇸",
  Vietnam: "🇻🇳",
};

function mapFailure(result: Exclude<PublishedDiscoveryResult, { status: "ok" }>): PublishedMapResult {
  return result.status === "empty" ? result : { status: "error", message: result.message };
}

export async function loadPublishedMap(): Promise<PublishedMapResult> {
  const catalog = await loadPublishedDiscoveryCatalog();
  if (catalog.status !== "ok") return mapFailure(catalog);

  const byPlace = new Map<string, PublishedMapPlace>();
  for (const recipe of catalog.recipes) {
    if (!recipe.place || !recipe.placeSlug || recipe.placeLatitude === null || recipe.placeLongitude === null) {
      continue;
    }

    const existing = byPlace.get(recipe.placeSlug);
    if (existing) {
      if (!existing.recipes.some((candidate) => candidate.slug === recipe.slug)) {
        existing.recipes.push({
          slug: recipe.slug,
          title: recipe.title,
          summary: recipe.summary,
          culturalNote: recipe.culturalNote,
          image: recipe.image,
          alt: recipe.alt,
          category: recipe.category,
          totalMinutes: recipe.totalMinutes,
        });
      }
      if (existing.note.startsWith("Explore reviewed dishes") && recipe.culturalNote) existing.note = recipe.culturalNote;
      continue;
    }

    byPlace.set(recipe.placeSlug, {
      slug: recipe.placeSlug,
      name: recipe.place,
      country: recipe.country,
      countrySlug: recipe.countrySlug,
      area: recipe.country,
      flag: countryFlags[recipe.country] ?? "🌍",
      latitude: recipe.placeLatitude,
      longitude: recipe.placeLongitude,
      recipes: [{
        slug: recipe.slug,
        title: recipe.title,
        summary: recipe.summary,
        culturalNote: recipe.culturalNote,
        image: recipe.image,
        alt: recipe.alt,
        category: recipe.category,
        totalMinutes: recipe.totalMinutes,
      }],
      note: recipe.culturalNote ?? `Explore reviewed dishes connected to ${recipe.place}, with their ingredients, method, and source record kept together.`,
    });
  }

  const places = [...byPlace.values()]
    .map((place) => ({
      ...place,
      recipes: place.recipes.sort((left, right) => left.title.localeCompare(right.title)).slice(0, 6),
    }))
    .sort((left, right) => left.country.localeCompare(right.country) || left.name.localeCompare(right.name));

  const countries: PublishedMapCountry[] = [];
  const unmappedCountries: string[] = [];
  const byCountry = new Map<string, DiscoveryRecipe[]>();
  for (const recipe of catalog.recipes) {
    if (recipe.countrySlug === "general") continue;
    byCountry.set(recipe.country, [...(byCountry.get(recipe.country) ?? []), recipe]);
  }
  for (const [name, recipes] of byCountry) {
    const geo = countryGeo[name];
    if (!geo) { unmappedCountries.push(name); continue; }
    const categoryCounts = new Map<string, number>();
    recipes.forEach((recipe) => recipe.menuCategories.forEach((category) => categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)));
    // Photographed recipes first, one image each, so the panel never repeats a photograph.
    const seenImages = new Set<string>();
    const featured = [...recipes].sort((left, right) => Number(right.hasPhotography) - Number(left.hasPhotography) || left.title.localeCompare(right.title))
      .filter((recipe) => { if (seenImages.has(recipe.image)) return false; seenImages.add(recipe.image); return true; })
      .slice(0, 4);
    countries.push({
      slug: recipes[0].countrySlug,
      name,
      flag: geo.flag,
      region: geo.region,
      latitude: geo.lat,
      longitude: geo.lng,
      recipeCount: recipes.length,
      categories: [...categoryCounts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 3).map(([slug]) => menuCategories.find((category) => category.slug === slug)?.label ?? slug),
      recipes: featured.map((recipe) => ({ slug: recipe.slug, title: recipe.title, summary: recipe.summary, culturalNote: recipe.culturalNote, image: recipe.image, alt: recipe.alt, category: recipe.category, totalMinutes: recipe.totalMinutes })),
      placeSlugs: places.filter((place) => place.country === name).map((place) => place.slug),
    });
  }
  countries.sort((left, right) => left.name.localeCompare(right.name));

  return places.length > 0 || countries.length > 0 ? { status: "ok", places, countries, unmappedCountries } : { status: "empty" };
}
