// DTO projection ported from Savora.Infrastructure.Catalog.EfOperatorCatalogQueries
// (ToSummary, the detail constructor, BuildIssues, ToPlaceResponse).
import type { PlaceResponse, RecipePlaceAssociationResponse, SourceAttributionResponse } from "../../contracts/catalog";
import type {
  OperatorMediaResponse,
  OperatorRecipeDetailResponse,
  OperatorRecipeSummaryResponse,
} from "../../contracts/operator";
import {
  PENDING_RIGHTS_STATUS,
  compareCultureStrings,
  compareOrdinalIgnoreCase,
  distinctBy,
  orderBy,
  relationTypeRank,
} from "../../domain/catalog";
import type {
  OperatorMediaAssociationRow,
  OperatorRecipeAggregate,
  OperatorVersionAggregate,
  PlaceRow,
  RecipeTranslationRow,
} from "./read-models";

/** Versions.OrderByDescending(VersionNumber).FirstOrDefault(). */
function selectLatestVersion(aggregate: OperatorRecipeAggregate): OperatorVersionAggregate | null {
  return orderBy(aggregate.versions, (a, b) => b.version.versionNumber - a.version.versionNumber)[0] ?? null;
}

/** SelectTranslation: requested, original, "en", then first by locale; null when there are none. */
function selectTranslation(version: OperatorVersionAggregate | null, locale: string): RecipeTranslationRow | null {
  if (version === null) return null;
  const translations = version.translations;
  return (
    translations.find((translation) => translation.locale === locale) ??
    translations.find((translation) => translation.locale === version.version.originalLocale) ??
    translations.find((translation) => translation.locale === "en") ??
    orderBy(translations, (a, b) => compareCultureStrings(a.locale, b.locale))[0] ??
    null
  );
}

/** MediaAssociations.SingleOrDefault(IsPrimary): more than one match is an error. */
function selectPrimaryMedia(associations: readonly OperatorMediaAssociationRow[]): OperatorMediaAssociationRow | null {
  const matches = associations.filter((association) => association.isPrimary);
  if (matches.length > 1) throw new Error("Sequence contains more than one matching element (primary media).");
  return matches[0] ?? null;
}

function toMediaResponse(association: OperatorMediaAssociationRow): OperatorMediaResponse {
  const asset = association.media;
  return {
    id: asset.id,
    position: association.position,
    isPrimary: association.isPrimary,
    provider: asset.provider,
    externalId: asset.externalId,
    storageKey: asset.storageKey,
    sourceUrl: asset.sourceUrl,
    contentType: asset.contentType,
    altText: asset.altText,
    creator: asset.creator,
    licenseCode: asset.licenseCode,
    licenseUrl: asset.licenseUrl,
    width: asset.width,
    height: asset.height,
    rightsStatus: asset.rightsStatus,
  };
}

function buildIssues(
  aggregate: OperatorRecipeAggregate,
  version: OperatorVersionAggregate | null,
  translation: RecipeTranslationRow | null,
  primaryMedia: OperatorMediaAssociationRow | null,
): string[] {
  const issues: string[] = [];
  if (version === null) {
    issues.push("MissingVersion");
  } else {
    if (translation === null) issues.push("MissingTranslation");
    if (version.ingredients.length === 0) issues.push("MissingIngredients");
    if (version.steps.length === 0) issues.push("MissingSteps");
    if (version.sources.length === 0) issues.push("MissingSource");
  }

  if (aggregate.placeAssociationCount === 0) issues.push("MissingPlace");

  if (primaryMedia === null) issues.push("MissingPrimaryMedia");
  else if (primaryMedia.media.rightsStatus === PENDING_RIGHTS_STATUS) issues.push("PrimaryMediaRightsPending");

  return issues;
}

/** Operator ToPlaceResponse: unlike the public route, a place without names falls back to "und" / its slug. */
function toPlaceResponse(place: PlaceRow, locale: string): PlaceResponse {
  const name =
    place.names.find((candidate) => candidate.locale === locale) ??
    place.names.find((candidate) => candidate.locale === "en") ??
    orderBy(place.names, (a, b) => compareCultureStrings(a.locale, b.locale))[0] ??
    null;
  return {
    id: place.id,
    slug: place.slug,
    type: place.type,
    locale: name?.locale ?? "und",
    name: name?.name ?? place.slug,
    latitude: place.latitude,
    longitude: place.longitude,
    wikidataId: place.wikidataId,
  };
}

export function toOperatorSummary(aggregate: OperatorRecipeAggregate, locale: string): OperatorRecipeSummaryResponse {
  const version = selectLatestVersion(aggregate);
  const translation = selectTranslation(version, locale);
  const primaryMedia = selectPrimaryMedia(aggregate.mediaAssociations);
  // Sources of the latest version, then media providers, each in split-query row order:
  // Distinct keeps the first spelling of case-insensitive duplicates.
  const providerNames = [
    ...(version?.sources.map((source) => source.sourceName) ?? []),
    ...aggregate.mediaAssociations.map((association) => association.media.provider),
  ];
  const providers = orderBy(
    distinctBy(providerNames, (a, b) => compareOrdinalIgnoreCase(a, b) === 0),
    compareOrdinalIgnoreCase,
  );

  return {
    id: aggregate.recipe.id,
    slug: aggregate.recipe.slug,
    status: aggregate.recipe.status,
    latestVersion: version?.version.versionNumber ?? null,
    originalLocale: version?.version.originalLocale ?? null,
    locale: translation?.locale ?? null,
    title: translation?.title ?? null,
    summary: translation?.summary ?? null,
    createdAt: aggregate.recipe.createdAt,
    updatedAt: aggregate.recipe.updatedAt,
    providers,
    primaryMedia: primaryMedia === null ? null : toMediaResponse(primaryMedia),
    issues: buildIssues(aggregate, version, translation, primaryMedia),
  };
}

export function toOperatorDetail(aggregate: OperatorRecipeAggregate, locale: string): OperatorRecipeDetailResponse {
  const version = selectLatestVersion(aggregate);
  const translation = selectTranslation(version, locale);
  const media = orderBy(aggregate.mediaAssociations, (a, b) => a.position - b.position).map(toMediaResponse);
  const primaryMedia = selectPrimaryMedia(aggregate.mediaAssociations);

  const places: RecipePlaceAssociationResponse[] = orderBy(
    aggregate.placeAssociations,
    (a, b) =>
      Number(b.isPrimary) - Number(a.isPrimary) ||
      relationTypeRank(a.relationType) - relationTypeRank(b.relationType) ||
      compareCultureStrings(a.place.slug, b.place.slug),
  ).map((association) => ({
    place: toPlaceResponse(association.place, locale),
    relationType: association.relationType,
    isPrimary: association.isPrimary,
  }));

  return {
    id: aggregate.recipe.id,
    slug: aggregate.recipe.slug,
    status: aggregate.recipe.status,
    currentVersionId: aggregate.recipe.currentVersionId,
    latestVersion: version?.version.versionNumber ?? null,
    originalLocale: version?.version.originalLocale ?? null,
    locale: translation?.locale ?? null,
    title: translation?.title ?? null,
    summary: translation?.summary ?? null,
    culturalNote: translation?.culturalNote ?? null,
    servings: version?.version.servings ?? null,
    preparationMinutes: version?.version.preparationMinutes ?? null,
    cookingMinutes: version?.version.cookingMinutes ?? null,
    createdAt: aggregate.recipe.createdAt,
    updatedAt: aggregate.recipe.updatedAt,
    publishedAt: aggregate.recipe.publishedAt,
    ingredients: orderBy(version?.ingredients ?? [], (a, b) => a.position - b.position).map((ingredient) => ({
      position: ingredient.position,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      preparationNote: ingredient.preparationNote,
    })),
    steps: orderBy(version?.steps ?? [], (a, b) => a.position - b.position).map((step) => ({
      position: step.position,
      title: step.title,
      instruction: step.instruction,
      durationMinutes: step.durationMinutes,
    })),
    sources: orderBy(version?.sources ?? [], (a, b) => compareCultureStrings(a.sourceName, b.sourceName)).map(
      (source): SourceAttributionResponse => ({
        sourceUrl: source.sourceUrl,
        sourceName: source.sourceName,
        licenseCode: source.licenseCode,
        retrievedAt: source.retrievedAt,
        externalId: source.externalId,
      }),
    ),
    places,
    media,
    issues: buildIssues(aggregate, version, translation, primaryMedia),
  };
}
