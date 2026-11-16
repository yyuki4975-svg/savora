// Loads tracked domain aggregates the way the C# tools Include() them.
import { and, asc, eq, inArray, or, type SQL } from "drizzle-orm";
import { parseDotnetDecimal } from "../../domain/dotnet/decimal";
import { invalidOperation } from "../../domain/dotnet/errors";
import { fromPostgresTimestamptz } from "../../domain/dotnet/instant";
import { MediaAsset, type MediaRightsStatus } from "../../domain/model/media";
import {
  Recipe,
  RecipeIngredientLine,
  RecipeMediaAssociation,
  RecipeStep,
  RecipeTranslation,
  RecipeVersion,
  SourceAttribution,
  type PublicationStatus,
} from "../../domain/model/recipe";
import {
  mediaAssets,
  recipeIngredientLines,
  recipeMediaAssociations,
  recipes,
  recipeSteps,
  recipeTranslations,
  recipeVersions,
  sourceAttributions,
} from "../db/schema";
import type { ToolSession } from "./tool-database";

type RecipeRow = typeof recipes.$inferSelect;
type MediaRow = typeof mediaAssets.$inferSelect;

export function toRecipe(row: RecipeRow): Recipe {
  return new Recipe(
    row.id,
    row.slug,
    row.status as PublicationStatus,
    row.currentVersionId,
    fromPostgresTimestamptz(row.createdAt),
    fromPostgresTimestamptz(row.updatedAt),
    row.publishedAt === null ? null : fromPostgresTimestamptz(row.publishedAt),
  );
}

export function toMediaAsset(row: MediaRow): MediaAsset {
  return new MediaAsset(
    row.id,
    row.storageKey,
    row.contentType,
    row.altText,
    row.creator,
    row.licenseCode,
    row.licenseUrl,
    row.provider,
    row.externalId,
    row.sourceUrl,
    row.width,
    row.height,
    row.rightsStatus as MediaRightsStatus,
    fromPostgresTimestamptz(row.createdAt),
  );
}

/** Adds every version with translations, ingredients, steps and sources to the given recipes. */
export async function includeVersions(session: ToolSession, loaded: Recipe[]): Promise<void> {
  if (loaded.length === 0) return;
  const db = session.db;
  const byId = new Map(loaded.map((recipe) => [recipe.id, recipe]));
  const versionRows = await db
    .select()
    .from(recipeVersions)
    .where(inArray(recipeVersions.recipeId, [...byId.keys()]))
    .orderBy(asc(recipeVersions.recipeId), asc(recipeVersions.id));
  if (versionRows.length === 0) return;
  const versions = new Map<string, RecipeVersion>();
  for (const row of versionRows) {
    const version = new RecipeVersion(
      row.id,
      row.recipeId,
      row.versionNumber,
      row.originalLocale,
      row.servings,
      row.preparationMinutes,
      row.cookingMinutes,
      fromPostgresTimestamptz(row.createdAt),
    );
    versions.set(row.id, version);
    byId.get(row.recipeId)!.versions.push(version);
  }
  const versionIds = [...versions.keys()];
  // ToolSession owns one pg Client. A transaction must send one query at a time on that
  // connection; parallel Drizzle queries trigger pg's overlapping-query deprecation.
  // https://node-postgres.com/features/transactions
  const translations = await db.select().from(recipeTranslations).where(inArray(recipeTranslations.recipeVersionId, versionIds));
  const ingredients = await db.select().from(recipeIngredientLines).where(inArray(recipeIngredientLines.recipeVersionId, versionIds));
  const steps = await db.select().from(recipeSteps).where(inArray(recipeSteps.recipeVersionId, versionIds));
  const sources = await db.select().from(sourceAttributions).where(inArray(sourceAttributions.recipeVersionId, versionIds));
  for (const row of translations) {
    versions.get(row.recipeVersionId)!.translations.push(
      new RecipeTranslation(row.id, row.recipeVersionId, row.locale, row.title, row.summary, row.culturalNote, row.isMachineTranslated),
    );
  }
  for (const row of ingredients) {
    versions.get(row.recipeVersionId)!.ingredients.push(
      new RecipeIngredientLine(
        row.id,
        row.recipeVersionId,
        row.position,
        row.name,
        row.quantity === null ? null : parseDotnetDecimal(row.quantity)!,
        row.unit,
        row.preparationNote,
      ),
    );
  }
  for (const row of steps) {
    versions.get(row.recipeVersionId)!.steps.push(
      new RecipeStep(row.id, row.recipeVersionId, row.position, row.instruction, row.title, row.durationMinutes),
    );
  }
  for (const row of sources) {
    versions.get(row.recipeVersionId)!.sources.push(
      new SourceAttribution(
        row.id,
        row.recipeVersionId,
        row.sourceUrl,
        row.sourceName,
        row.licenseCode,
        fromPostgresTimestamptz(row.retrievedAt),
        row.externalId,
      ),
    );
  }
}

/** Adds media associations (and returns their tracked media assets when requested). */
export async function includeMediaAssociations(session: ToolSession, loaded: Recipe[], withAssets: boolean): Promise<MediaAsset[]> {
  if (loaded.length === 0) return [];
  const db = session.db;
  const byId = new Map(loaded.map((recipe) => [recipe.id, recipe]));
  const rows = await db.select().from(recipeMediaAssociations).where(inArray(recipeMediaAssociations.recipeId, [...byId.keys()]));
  for (const row of rows) {
    byId.get(row.recipeId)!.mediaAssociations.push(new RecipeMediaAssociation(row.recipeId, row.mediaAssetId, row.position, row.isPrimary));
  }
  if (!withAssets || rows.length === 0) return [];
  const assetRows = await db.select().from(mediaAssets).where(inArray(mediaAssets.id, [...new Set(rows.map((row) => row.mediaAssetId))]));
  return assetRows.map(toMediaAsset);
}

/** Recipes.SingleOrDefault(slug == value): the slug is compared exactly as given. */
export async function findRecipeBySlug(session: ToolSession, slug: string | null): Promise<Recipe | undefined> {
  if (slug === null) return undefined;
  const rows = await session.db.select().from(recipes).where(eq(recipes.slug, slug)).limit(2);
  if (rows.length > 1) throw invalidOperation("Sequence contains more than one element.");
  return rows[0] === undefined ? undefined : toRecipe(rows[0]);
}

/** MediaAssets.SingleOrDefault(provider == p && external_id == e). */
export async function findMediaAsset(session: ToolSession, provider: string | null, externalId: string | null): Promise<MediaAsset | undefined> {
  if (provider === null || externalId === null) return undefined;
  const rows = await session.db
    .select()
    .from(mediaAssets)
    .where(and(eq(mediaAssets.provider, provider), eq(mediaAssets.externalId, externalId)) as SQL)
    .limit(2);
  if (rows.length > 1) throw invalidOperation("Sequence contains more than one element.");
  return rows[0] === undefined ? undefined : toMediaAsset(rows[0]);
}

export { or };
