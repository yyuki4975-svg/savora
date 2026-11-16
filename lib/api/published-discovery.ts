import "server-only";
import { menuCategories, recipeMenuCategories, type MenuCategory } from "../recipe-menu";

import { publishedMediaReferenceUrl } from "./published-recipe-presentation";
import {
  isCatalogApiEnabled,
  listDiscoveryRecipes,
  type DiscoveryRecipeSummary,
} from "./savora-client";

export type DiscoveryRecipe = {
  slug: string;
  title: string;
  summary: string;
  culturalNote: string | null;
  image: string;
  alt: string;
  hasPhotography: boolean;
  place: string | null;
  placeSlug: string | null;
  placeLatitude: number | null;
  placeLongitude: number | null;
  country: string;
  countrySlug: string;
  category: string;
  menuCategories: MenuCategory[];
  ingredients: string[];
  keywords: string[];
  sourceName: string;
  totalMinutes: number | null;
};

export type PublishedDiscoveryResult =
  | { status: "ok"; recipes: DiscoveryRecipe[] }
  | { status: "empty" }
  | { status: "error"; message: string };

const archivePlaceholder = "/images/recipe-archive-placeholder.svg";

const providerCountryNames: Record<string, string> = {
  Algerian: "Algeria",
  Argentina: "Argentina",
  Australian: "Australia",
  British: "United Kingdom",
  Canadian: "Canada",
  Chinese: "China",
  Croatian: "Croatia",
  Egyptian: "Egypt",
  Filipino: "Philippines",
  France: "France",
  Greek: "Greece",
  India: "India",
  Irish: "Ireland",
  Italian: "Italy",
  Jamaican: "Jamaica",
  Japanese: "Japan",
  Kenyan: "Kenya",
  Malaysian: "Malaysia",
  Mexican: "Mexico",
  Moroccan: "Morocco",
  Netherlands: "Netherlands",
  Norway: "Norway",
  Polish: "Poland",
  Portuguese: "Portugal",
  Russian: "Russia",
  "Saudi Arabian": "Saudi Arabia",
  Slovakia: "Slovakia",
  Spanish: "Spain",
  Syrian: "Syria",
  Thai: "Thailand",
  Tunisian: "Tunisia",
  Turkish: "Türkiye",
  Ukrainian: "Ukraine",
  "United States": "United States",
  Uruguayan: "Uruguay",
  Venezuela: "Venezuela",
  Vietnamese: "Vietnam",
};

// Places below country level, by the country they belong to.
const placeCountryNames: Record<string, string> = {
  adana: "Türkiye",
  athens: "Greece",
  bangkok: "Thailand",
  chengdu: "China",
  delhi: "India",
  hanoi: "Vietnam",
  jeonju: "South Korea",
  kingston: "Jamaica",
  marrakech: "Morocco",
  "mexico-city": "Mexico",
  "new-orleans": "United States",
  nice: "France",
  padang: "Indonesia",
  "rio-de-janeiro": "Brazil",
  rome: "Italy",
  taiwan: "China",
  tokyo: "Japan",
  valencia: "Spain",
};

export function countryForPlaceSlug(slug: string) {
  return placeCountryNames[slug] ?? null;
}

function slugifyFacet(value: string) {
  return value.toLocaleLowerCase("en").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// One facet per country: some records say "Turkey", others "Türkiye".
const countryAliases: Record<string, string> = { Turkey: "Türkiye" };

function countryFor(recipe: DiscoveryRecipeSummary, placeSlug: string | null) {
  const providerMatch = recipe.summary.match(/associated by the provider with ([^,]+), imported/i);
  const providerCountry = providerMatch ? providerCountryNames[providerMatch[1]] : null;
  const countryPlace = recipe.places.find(candidate => candidate.place.type === "Country")?.place;
  const country = providerCountry ?? countryPlace?.name ?? (placeSlug ? placeCountryNames[placeSlug] : null) ?? "General";
  return countryAliases[country] ?? country;
}

function keywordIndex(values: Array<string | null | undefined>) {
  const phrases = values.flatMap((value) => value?.split(/[|;,/]/) ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(phrases.flatMap((phrase) => [
    phrase.toLocaleLowerCase("en"),
    ...phrase.toLocaleLowerCase("en").split(/[^\p{L}\p{N}]+/u).filter((token) => token.length > 1),
  ])));
}

function categoryFor(recipe: DiscoveryRecipeSummary) {
  const sourceName = recipe.source?.sourceName ?? "";
  if (sourceName.includes("National Heart, Lung, and Blood Institute")) return "Public-health recipe";
  const ingredients = recipe.ingredients.join(" ");
  if (/fish|salmon|cod|tilapia|shrimp|prawn|seafood/i.test(ingredients)) return "Seafood";
  if (/chicken|turkey/i.test(ingredients)) return "Chicken";
  if (/beef|lamb|pork|guanciale|sausage/i.test(ingredients)) return "Meat";
  if (/pasta|spaghetti|noodle/i.test(ingredients)) return "Pasta";
  return "Reviewed recipe";
}

function toDiscoveryRecipe(recipe: DiscoveryRecipeSummary): DiscoveryRecipe | null {
  const image = publishedMediaReferenceUrl(recipe.primaryMedia) ?? archivePlaceholder;
  const source = recipe.source;
  if (!source) return null;

  const association = recipe.places.find((candidate) => candidate.isPrimary) ?? recipe.places[0] ?? null;
  const placeSlug = association?.place.slug ?? null;
  const country = countryFor(recipe, placeSlug);
  const category = categoryFor(recipe);
  const recipeCategories = recipeMenuCategories(recipe);
  const preparation = recipe.preparationMinutes === null ? 0 : Number(recipe.preparationMinutes);
  const cooking = recipe.cookingMinutes === null ? 0 : Number(recipe.cookingMinutes);

  return {
    slug: recipe.slug,
    title: recipe.title,
    summary: recipe.summary,
    culturalNote: recipe.culturalNote,
    image,
    alt: recipe.primaryMedia?.altText || `Savora archive entry for ${recipe.title}; photography pending`,
    hasPhotography: recipe.primaryMedia !== null,
    place: association?.place.name ?? null,
    placeSlug,
    placeLatitude: association?.place.latitude === null || association?.place.latitude === undefined
      ? null
      : Number(association.place.latitude),
    placeLongitude: association?.place.longitude === null || association?.place.longitude === undefined
      ? null
      : Number(association.place.longitude),
    country,
    countrySlug: slugifyFacet(country),
    category,
    menuCategories: recipeCategories,
    ingredients: recipe.ingredients,
    keywords: keywordIndex([
      recipe.title,
      recipe.summary,
      recipe.culturalNote,
      category,
      ...menuCategories.filter(c => recipeCategories.includes(c.slug)).flatMap(c => [c.label, c.terms]),
      country,
      association?.place.name,
      source.sourceName,
      ...recipe.ingredients,
    ]),
    sourceName: source.sourceName,
    totalMinutes: preparation + cooking > 0 ? preparation + cooking : null,
  };
}

// Share only the validated public projection. Bound memory to one snapshot, merge
// concurrent readers, and retry failures on the next request. No account data enters here.
let snapshot: { expires: number; catalog: DiscoveryRecipeSummary[] } | null = null;
let pendingSnapshot: Promise<Awaited<ReturnType<typeof listDiscoveryRecipes>>> | null = null;

async function discoverySnapshot() {
  if (snapshot && snapshot.expires > Date.now()) return { status: "ok" as const, data: { items: snapshot.catalog } };
  pendingSnapshot ??= listDiscoveryRecipes("en").then(result => {
    if (result.status === "ok") snapshot = { expires: Date.now() + 60_000, catalog: result.data.items };
    return result;
  }).finally(() => { pendingSnapshot = null; });
  return pendingSnapshot;
}

export async function loadPublishedDiscoveryCatalog(limit = 11000): Promise<PublishedDiscoveryResult> {
  if (!isCatalogApiEnabled()) {
    return { status: "error", message: "The published archive is paused while its first-party catalog recovers." };
  }

  const catalog = await discoverySnapshot();
  if (catalog.status !== "ok") {
    return { status: "error", message: "The published archive could not be reached." };
  }
  if (catalog.data.items.length === 0) return { status: "empty" };

  const requestedLimit = Math.min(11000, Math.max(1, limit));
  const recipes = catalog.data.items.slice(0, requestedLimit).map(toDiscoveryRecipe)
    .filter((recipe): recipe is DiscoveryRecipe => recipe !== null)
    .sort((left, right) =>
      Number(right.hasPhotography) - Number(left.hasPhotography) || left.title.localeCompare(right.title));

  if (recipes.length !== Math.min(catalog.data.items.length, requestedLimit)) {
    return { status: "error", message: "Some published records are missing source evidence." };
  }

  return { status: "ok", recipes };
}
