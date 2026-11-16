// DTO projection ported from EfCatalogQueries (the in-memory Select after ToListAsync).
import type {
  IngredientLineResponse,
  PlaceResponse,
  RecipeDetailResponse,
  RecipeDiscoverySummaryResponse,
  RecipeMediaResponse,
  RecipePlaceAssociationResponse,
  RecipeStepResponse,
  RecipeSummaryResponse,
  SourceAttributionResponse,
} from "../../contracts/catalog";
import {
  VERIFIED_RIGHTS_STATUS,
  compareCultureStrings,
  orderBy,
  relationTypeRank,
  selectPlaceName,
  selectTranslation,
} from "../../domain/catalog";
import type {
  MediaAssetRow,
  PlaceRow,
  RecipeAggregate,
  RecipeMediaAssociationRow,
  RecipePlaceAssociationRow,
  RecipeVersionRow,
  SourceAttributionRow,
} from "./read-models";

function requireVersion(aggregate: RecipeAggregate): RecipeVersionRow {
  if (aggregate.version === null) {
    throw new Error(`Published recipe '${aggregate.recipe.slug}' has no current version.`);
  }
  return aggregate.version;
}

export function toPlaceResponse(place: PlaceRow, locale: string): PlaceResponse {
  const name = selectPlaceName(place.names, locale);
  return {
    id: place.id,
    slug: place.slug,
    type: place.type,
    locale: name.locale,
    name: name.name,
    latitude: place.latitude,
    longitude: place.longitude,
    wikidataId: place.wikidataId,
  };
}

function toSourceResponse(source: SourceAttributionRow): SourceAttributionResponse {
  return {
    sourceUrl: source.sourceUrl,
    sourceName: source.sourceName,
    licenseCode: source.licenseCode,
    retrievedAt: source.retrievedAt,
    externalId: source.externalId,
  };
}

function orderSources(sources: readonly SourceAttributionRow[]): SourceAttributionRow[] {
  return orderBy(sources, (a, b) => compareCultureStrings(a.sourceName, b.sourceName));
}

function toPlaceAssociations(
  associations: readonly RecipePlaceAssociationRow[],
  locale: string,
): RecipePlaceAssociationResponse[] {
  return orderBy(associations, (a, b) =>
    Number(b.isPrimary) - Number(a.isPrimary) ||
    relationTypeRank(a.relationType) - relationTypeRank(b.relationType) ||
    compareCultureStrings(a.place.slug, b.place.slug),
  ).map((association) => ({
    place: toPlaceResponse(association.place, locale),
    relationType: association.relationType,
    isPrimary: association.isPrimary,
  }));
}

/** SingleOrDefault(IsPrimary && RightsStatus == Verified): more than one match is an error. */
function selectPrimaryMedia(associations: readonly RecipeMediaAssociationRow[]): MediaAssetRow | null {
  const matches = associations.filter(
    (association) => association.isPrimary && association.media.rightsStatus === VERIFIED_RIGHTS_STATUS,
  );
  if (matches.length > 1) throw new Error("Sequence contains more than one matching element (primary media).");
  return matches[0]?.media ?? null;
}

function toMediaResponse(media: MediaAssetRow | null): RecipeMediaResponse | null {
  if (media === null) return null;
  return {
    storageKey: media.storageKey,
    sourceUrl: media.sourceUrl,
    contentType: media.contentType,
    altText: media.altText,
    creator: media.creator,
    licenseCode: media.licenseCode,
    licenseUrl: media.licenseUrl,
    provider: media.provider,
    externalId: media.externalId,
    width: media.width,
    height: media.height,
  };
}

export function toRecipeSummary(aggregate: RecipeAggregate, locale: string): RecipeSummaryResponse {
  const version = requireVersion(aggregate);
  const translation = selectTranslation(aggregate.translations, locale, version.originalLocale);
  return {
    id: aggregate.recipe.id,
    slug: aggregate.recipe.slug,
    locale: translation.locale,
    title: translation.title,
    summary: translation.summary,
    servings: version.servings,
    preparationMinutes: version.preparationMinutes,
    cookingMinutes: version.cookingMinutes,
    publishedAt: aggregate.recipe.publishedAt,
  };
}

export function toDiscoverySummary(aggregate: RecipeAggregate, locale: string): RecipeDiscoverySummaryResponse {
  const version = requireVersion(aggregate);
  const translation = selectTranslation(aggregate.translations, locale, version.originalLocale);
  const source = orderSources(aggregate.sources)[0];
  return {
    id: aggregate.recipe.id,
    slug: aggregate.recipe.slug,
    locale: translation.locale,
    title: translation.title,
    summary: translation.summary,
    culturalNote: translation.culturalNote,
    preparationMinutes: version.preparationMinutes,
    cookingMinutes: version.cookingMinutes,
    publishedAt: aggregate.recipe.publishedAt,
    ingredients: orderBy(aggregate.ingredients, (a, b) => a.position - b.position).map((ingredient) => ingredient.name),
    source: source === undefined ? null : toSourceResponse(source),
    places: toPlaceAssociations(aggregate.placeAssociations, locale),
    primaryMedia: toMediaResponse(selectPrimaryMedia(aggregate.mediaAssociations)),
  };
}

export function toRecipeDetail(aggregate: RecipeAggregate, locale: string): RecipeDetailResponse {
  const version = requireVersion(aggregate);
  const translation = selectTranslation(aggregate.translations, locale, version.originalLocale);
  const primaryMedia = selectPrimaryMedia(aggregate.mediaAssociations);
  return {
    id: aggregate.recipe.id,
    slug: aggregate.recipe.slug,
    locale: translation.locale,
    title: translation.title,
    summary: translation.summary,
    culturalNote: translation.culturalNote,
    version: version.versionNumber,
    servings: version.servings,
    preparationMinutes: version.preparationMinutes,
    cookingMinutes: version.cookingMinutes,
    publishedAt: aggregate.recipe.publishedAt,
    ingredients: orderBy(aggregate.ingredients, (a, b) => a.position - b.position).map(
      (ingredient): IngredientLineResponse => ({
        position: ingredient.position,
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
        preparationNote: ingredient.preparationNote,
      }),
    ),
    steps: orderBy(aggregate.steps, (a, b) => a.position - b.position).map(
      (step): RecipeStepResponse => ({
        position: step.position,
        title: step.title,
        instruction: step.instruction,
        durationMinutes: step.durationMinutes,
      }),
    ),
    sources: orderSources(aggregate.sources).map(toSourceResponse),
    places: toPlaceAssociations(aggregate.placeAssociations, locale),
    primaryMedia: toMediaResponse(primaryMedia),
  };
}
