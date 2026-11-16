import type { Metadata } from "next";
import { cache, Suspense } from "react";
import Link from "next/link";
import { Footer, Header } from "../../ui";
import {
  draftMediaUrl,
  externalMealIdFromSlug,
  ingredientMeasure,
  sourceLabelsFromDetail,
} from "../../../lib/api/draft-recipe-presentation";
import {
  getDraftRecipeByReference,
  getRecipe,
  isCatalogApiEnabled,
  isDraftCatalogEnabled,
} from "../../../lib/api/savora-client";
import {
  primaryRecipePlace,
  publishedMediaUrl,
  publishedRecipeCategory,
} from "../../../lib/api/published-recipe-presentation";
import { countryForPlaceSlug } from "../../../lib/api/published-discovery";
import { recipeSignals } from "../../../lib/search/smart-search";
import { recipeMenuCategories } from "../../../lib/recipe-menu";
import { recipeMatchesIngredientFacet } from "../../../lib/explore-search";
import { TasteRecorder } from "../../explore/search-assist";
import styles from "./recipe-detail.module.css";
import { RecipeSheet } from "./recipe-sheet";
import { SelectableRecipeImage } from "./selectable-recipe-image";
import { CatalogRecipeBinding } from "../../catalog-recipe-binding";
import type { RecipeDetail } from "../../../lib/api/savora-client";
import { RecipeEquipment, RecipeLabel } from "../../recipe-display-copy";
import { RecipeKitchenActions } from '../../recipe-kitchen-actions';
import { RelatedRecipes } from "./related-recipes";
import { RecipeNotes } from "./recipe-notes";
import { ErrorScene } from "../../error-scene";
import { notFound } from "next/navigation";
import { siteUrl } from "../../site-url";
import { formatRecipeMinutes, methodForDisplay, recipeEquipment, recipeSummaryForDisplay, recipeTime } from "../../recipe-presentation";

type RecipeView = {
  canonical?: RecipeDetail;
  id: string;
  title: string;
  area: string;
  category: string;
  image: string;
  photoPresentation?: string;
  deck: string;
  servings: number;
  photoSource?: { creator: string; licenseCode: string; licenseUrl: string; sourceUrl: string | null };
  sourceLicense?: string;
  sourceName?: string;
  ingredients: Array<{ ingredient: string; measure: string; note?: string | null }>;
  steps: string[];
  sourceUrl: string;
  areaDescriptor: string;
  catalogSource: "postgresql-draft" | "postgresql-public";
};

type RecipeLoadResult =
  | { status: "ok"; recipe: RecipeView }
  | { status: "not-found" }
  | { status: "error"; message: string };

const externalMealIdPattern = /^\d{1,12}$/;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const unavailableMessage = "The canonical recipe is temporarily unavailable. Please try again shortly.";

function cleanRecipeSteps(steps: string[]) {
  return steps
    .map((step) => step.trim())
    .filter((step) => step && !/^(?:step|method|direction)\s*\d+[\s.:)-]*$/iu.test(step))
    .map((step) => step.replace(/^(?:step\s*)?\d+\s*[.):\-]\s*/iu, "").trim())
    .filter(Boolean);
}

function publicIngredientNote(note: string | null | undefined) {
  if (!note || /^quantity pending editorial review\.?$/i.test(note.trim())) return null;
  return note;
}

const unicodeFractions: Record<string, string> = {
  "⅛": "1/8", "¼": "1/4", "⅓": "1/3", "⅜": "3/8", "½": "1/2",
  "⅝": "5/8", "⅔": "2/3", "¾": "3/4", "⅞": "7/8",
};

function standardizeFractions(value: string) {
  return Object.entries(unicodeFractions).reduce(
    (result, [glyph, fraction]) => result.replaceAll(glyph, fraction),
    value,
  );
}

function withConservativeUnit(ingredient: string, rawMeasure: string) {
  const measure = standardizeFractions(rawMeasure.trim());
  if (!/^(?:\d+(?:\.\d+)?|\d+\/\d+|\d+\s+\d+\/\d+)$/u.test(measure)) return measure;

  const normalizedIngredient = ingredient.trim().toLowerCase();
  const unit = /^bread(?:\s|$)/u.test(normalizedIngredient) ? "slices"
    : /^eggs?(?:\s|$)/u.test(normalizedIngredient) ? "large"
      : /^salt(?:\s|$)/u.test(normalizedIngredient) ? "tsp"
        : /^garlic(?:\s|$)/u.test(normalizedIngredient) ? "cloves"
          : /^(?:lemon|lime|onion)(?:s|\s|$)/u.test(normalizedIngredient) ? "whole"
            : null;
  return unit ? `${measure} ${unit}` : measure;
}

function shouldShowIngredientNote(note: string | null | undefined, measure: string) {
  if (!note) return false;
  const normalize = (value: string) => standardizeFractions(value).replaceAll(/\s+/gu, "").toLowerCase();
  const normalizedNote = normalize(note);
  const normalizedMeasure = normalize(measure);
  if (normalizedNote === normalizedMeasure || normalizedMeasure.startsWith(normalizedNote)) return false;
  if (/^\d+(?:\.\d+)?$/u.test(note.trim()) && /^\d+(?:\/\d+)?/u.test(measure)) return false;
  return true;
}

type TasteCategory = "Sour" | "Sweet" | "Bitter" | "Spicy" | "Salty";

const tasteSignals: Array<[TasteCategory, RegExp]> = [
  ["Sour", /\b(lemon|lime|vinegar|tamarind|yogh?urt|sour|citrus|sumac|pickle|pickled)\b/i],
  ["Sweet", /\b(sugar|honey|syrup|caramel|jam|molasses|chocolate|banana|mango|date|sweet)\b/i],
  ["Bitter", /\b(coffee|cocoa|dark chocolate|radicchio|endive|grapefruit|bitter)\b/i],
  ["Spicy", /\b(chilli|chili|chile|cayenne|jalape(?:n|ñ)o|harissa|hot sauce|pepper flakes|paprika|pepper)\b/i],
  ["Salty", /\b(salt|soy sauce|miso|fish sauce|anchov(?:y|ies)|feta|parmesan|bacon|ham|olive|brine|lamb|beef|chicken)\b/i],
];

function recipeTasteCategories(recipe: RecipeView): TasteCategory[] {
  const searchable = [
    recipe.title,
    recipe.category,
    ...recipe.ingredients.flatMap((item) => [item.ingredient, item.measure, item.note ?? ""]),
    ...recipe.steps,
  ].join(" ");
  const matches = tasteSignals.filter(([, pattern]) => pattern.test(searchable)).map(([taste]) => taste);
  if (matches.length > 0) return matches.slice(0, 3);
  return /dessert|cake|pastry|pudding|cookie|biscuit/i.test(recipe.category) ? ["Sweet"] : ["Salty"];
}

const slugify = (value: string) => value.toLocaleLowerCase("en").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** Coarse signals for the on-device taste profile (menu, ingredient facets, country, quick, vegetarian). */
function tasteSignalsFor(recipe: RecipeView, minutes: number | null): string[] {
  if (!recipe.canonical) return [];
  const names = recipe.ingredients.map((item) => item.ingredient);
  const countryPlace = recipe.canonical.places.find((association) => association.place.type === "Country")?.place;
  const primary = primaryRecipePlace(recipe.canonical);
  const country = countryPlace?.name ?? (primary ? countryForPlaceSlug(primary.place.slug) : null);
  return recipeSignals({ slug: recipe.id, title: recipe.title, ingredients: names, menuCategories: recipeMenuCategories({ title: recipe.title, summary: recipe.deck, ingredients: names }),
    countrySlug: country ? slugify(country) : "general", country: country ?? "", place: null, totalMinutes: minutes, text: "" }, (facet, ingredients) => recipeMatchesIngredientFacet(facet, ingredients));
}

async function loadDraftRecipe(reference: string): Promise<RecipeLoadResult> {
  const result = await getDraftRecipeByReference(reference, "en");
  if (result.status !== "ok") return result;
  const primaryMedia = result.data.media.find((media) => media.isPrimary) ?? null;
  const image = draftMediaUrl(primaryMedia);
  const id = externalMealIdFromSlug(result.data.slug);
  if (!result.data.title || !result.data.summary || !image || !id || result.data.sources.length === 0) {
    return { status: "error", message: unavailableMessage };
  }

  const labels = sourceLabelsFromDetail(result.data);
  return {
    status: "ok",
    recipe: {
      id,
      title: result.data.title,
      area: labels.area,
      category: labels.category,
      image,
      photoPresentation: result.data.culturalNote?.match(/(?:^|\n)Photo presentation: ([^\n]+)/u)?.[1],
      deck: result.data.summary,
      servings: Number(result.data.servings ?? 1),
      ingredients: result.data.ingredients.map((ingredient) => ({
        ingredient: ingredient.name,
        measure: withConservativeUnit(ingredient.name, ingredientMeasure(ingredient)),
        note: publicIngredientNote(ingredient.preparationNote),
      })),
      steps: cleanRecipeSteps(result.data.steps.map((step) => step.instruction)),
      sourceUrl: result.data.sources[0].sourceUrl,
      areaDescriptor: labels.area === "Global" ? "Global source label" : `${labels.area} · provider label`,
      catalogSource: "postgresql-draft",
    },
  };
}

async function loadPublishedRecipe(slug: string): Promise<RecipeLoadResult> {
  const result = await getRecipe(slug, "en");
  if (result.status !== "ok") return result;
  const data = result.data;
  const image = publishedMediaUrl(data);
  if (!image || !data.primaryMedia || data.sources.length === 0) {
    return { status: "error", message: unavailableMessage };
  }

  const primaryPlace = primaryRecipePlace(data);
  const area = primaryPlace?.place.name ?? "Global";
  const source = data.sources.find((candidate) => candidate.sourceName === "Wikibooks Cookbook contributors")
    ?? data.sources.find((candidate) => /official|government|institute/i.test(candidate.sourceName))
    ?? data.sources.find((candidate) => !candidate.sourceUrl.startsWith("https://www.foodsafety.gov/"))
    ?? data.sources[0];
  return {
    status: "ok",
    recipe: {
      id: data.slug,
      title: data.title,
      area,
      category: publishedRecipeCategory(data),
      image,
      photoPresentation: data.culturalNote?.match(/(?:^|\n)Photo presentation: ([^\n]+)/u)?.[1],
      deck: data.summary,
      servings: Number(data.servings),
      photoSource: data.primaryMedia ? {
        creator: data.primaryMedia.creator,
        licenseCode: data.primaryMedia.licenseCode,
        licenseUrl: data.primaryMedia.licenseUrl,
        sourceUrl: data.primaryMedia.sourceUrl,
      } : undefined,
      sourceLicense: source.licenseCode,
      sourceName: source.sourceName,
      ingredients: data.ingredients.map((ingredient) => ({
        ingredient: ingredient.name,
        measure: withConservativeUnit(ingredient.name, ingredientMeasure(ingredient)),
        note: publicIngredientNote(ingredient.preparationNote),
      })),
      steps: cleanRecipeSteps(data.steps.map((step) => step.instruction)),
      sourceUrl: source.sourceUrl,
      // A place below country level also names its country (Taiwan · China, Chengdu · China).
      areaDescriptor: primaryPlace ? [area, primaryPlace.place.type === "Country" ? null : countryForPlaceSlug(primaryPlace.place.slug)].filter(Boolean).join(" · ") : "General",
      catalogSource: "postgresql-public",
      canonical: data,
    },
  };
}

const loadRecipe = cache(async (reference: string): Promise<RecipeLoadResult> => {
  if (isCatalogApiEnabled() && slugPattern.test(reference)) {
    const published = await loadPublishedRecipe(reference);
    if (published.status !== "not-found" || !isDraftCatalogEnabled()) return published;
  }
  if (isDraftCatalogEnabled() &&
      (externalMealIdPattern.test(reference) || reference.startsWith("themealdb-"))) {
    return loadDraftRecipe(reference);
  }
  return isCatalogApiEnabled()
    ? { status: "not-found" }
    : { status: "error", message: unavailableMessage };
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await loadRecipe(id);
  const title = result.status === "ok" ? result.recipe.title : "Recipe";
  return {
    title,
    description: result.status === "ok" ? `A clear paper-style recipe for ${title}.` : "Recipe from the Savora global archive.",
    robots: result.status === "ok" && result.recipe.catalogSource === "postgresql-draft"
      ? { index: false, follow: false }
      : undefined,
  };
}

export default async function ImportedRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await loadRecipe(id);

  // A recipe that is not in the catalogue is a real 404; a catalogue that did not answer is a retryable state.
  if (result.status === "not-found") notFound();
  if (result.status !== "ok") return <main><Header /><ErrorScene kind="unavailable" message={result.message} back={{ href: "/explore", label: "Return to Explore" }} /><Footer /></main>;

  const recipe = result.recipe;
  const tastes = recipeTasteCategories(recipe);
  const equipment = recipeEquipment(recipe.steps, recipe.ingredients.map(item => item.note ?? ""));
  // A step that was only the equipment preamble is shown in the equipment list, not as a blank numbered step.
  // `source` keeps the original index so localized text still binds to the right row.
  const time = recipeTime({ preparationMinutes: recipe.canonical?.preparationMinutes, cookingMinutes: recipe.canonical?.cookingMinutes, stepMinutes: recipe.canonical?.steps.map(step => step.durationMinutes) }, recipe.steps);
  const methodSteps = recipe.steps.map((step, source) => ({ text: methodForDisplay(step, step), source })).filter(step => step.text.trim());

  return (
    <main className={styles.page} data-catalog-source={recipe.catalogSource} data-recipe-slug={recipe.canonical?.slug}>
      <Header />
      {recipe.canonical ? <CatalogRecipeBinding english={recipe.canonical} /> : null}
      {recipe.canonical ? <TasteRecorder signals={tasteSignalsFor(recipe, time && !time.estimated ? time.minutes : null)} weight={1.5} once={`recipe:${recipe.id}`} /> : null}
      <RecipeSheet>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/explore">Explore</Link><span aria-hidden="true">/</span><span>Recipes</span>
        </nav>

        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.origin}>{recipe.areaDescriptor}</p>
            <h1 data-catalog-field={recipe.canonical ? "title" : undefined}>{recipe.title}</h1>
            <p className={styles.deck} data-catalog-field={recipe.canonical ? "summary" : undefined}>{recipeSummaryForDisplay(recipe.deck, recipe.deck)}</p>
            <dl className={styles.meta}>
              <div><dt>Taste</dt><dd>{tastes.join(" · ")}</dd></div>
              <div><dt>Time</dt><dd title={time?.estimated ? "Added up from the times written in the method" : undefined}>{time ? `${time.estimated ? "About " : ""}${formatRecipeMinutes(time.minutes)}` : "Not stated"}</dd></div>
            </dl>
            {recipe.canonical ? <RecipeKitchenActions slug={recipe.canonical.slug} servings={recipe.servings} cook={false} print className={styles.actions} /> : null}
          </div>
          <div>
            <SelectableRecipeImage src={recipe.image} alt={recipe.title} />
            {recipe.photoPresentation ? <p className={styles.photoPresentation}>{recipe.photoPresentation}</p> : null}
          </div>
        </section>

        <section className={styles.cookingLayout}>
          <aside className={styles.ingredients}>
            <h2>Ingredients</h2>
            <ul>{recipe.ingredients.map((item, index) => <li key={`${index}-${item.measure}-${item.ingredient}`}><strong className={styles.measure} data-catalog-field={recipe.canonical ? `ingredient:${index}:measure` : undefined}>{item.measure}</strong><span><span data-catalog-field={recipe.canonical ? `ingredient:${index}:name` : undefined}>{item.ingredient}</span>{shouldShowIngredientNote(item.note, item.measure) ? <small data-catalog-field={recipe.canonical ? `ingredient:${index}:note` : undefined}>{item.note}</small> : null}</span></li>)}</ul>
            <RecipeEquipment items={equipment} className={styles.prepNote} />
          </aside>

          <section className={styles.method}>
            <div className={styles.methodHeading}><h2>Method</h2><p>{methodSteps.length} clear steps</p></div>
            <ol>{methodSteps.map((step, index) => <li key={`${step.source}-${step.text.slice(0, 24)}`}><span className={styles.stepNumber}>{index + 1}</span><p data-catalog-field={recipe.canonical ? `step:${step.source}` : undefined}>{step.text}</p></li>)}</ol>
          </section>
        </section>

        <footer className={styles.sourceLine}>
          {recipe.canonical ? <Link href={`/recipes/${recipe.canonical.slug}/source`}><RecipeLabel name="source" /></Link> : <a href={recipe.sourceUrl} target="_blank" rel="noreferrer"><RecipeLabel name="source" /></a>}
          {/* Printed copies carry the page address so the cook can find the source and notes again. */}
          {recipe.canonical ? <p className={styles.printOnly} translate="no">{`${new URL(siteUrl()).host}/recipes/${recipe.canonical.slug}`}</p> : null}
        </footer>
      </RecipeSheet>
      {recipe.canonical ? <RecipeNotes slug={recipe.canonical.slug} /> : null}
      {recipe.canonical ? <Suspense fallback={null}><RelatedRecipes slug={recipe.canonical.slug} image={recipe.image} /></Suspense> : null}
      <Footer />
    </main>
  );
}
