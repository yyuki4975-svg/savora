// Ports Savora.Infrastructure.Catalog.EfCatalogQueries.
// Loading mirrors EF's split queries: select the page of recipes in SQL (same
// filter, ORDER BY and LIMIT), then load related rows by key and project in memory.
import { Inject, Injectable } from "@nestjs/common";
import { applyCatalogLocalization } from "../../application/catalog/catalog-localization";
import { and, asc, desc, eq, exists, inArray, isNotNull, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { CatalogQueries } from "../../application/catalog/catalog-queries";
import {
  toDiscoverySummary,
  toPlaceResponse,
  toRecipeDetail,
  toRecipeSummary,
} from "../../application/catalog/catalog-projection";
import type {
  IngredientLineRow,
  MediaAssetRow,
  PlaceNameRow,
  PlaceRow,
  RecipeAggregate,
  RecipeMediaAssociationRow,
  RecipePlaceAssociationRow,
  RecipeRow,
  RecipeStepRow,
  RecipeTranslationRow,
  RecipeVersionRow,
  SourceAttributionRow,
} from "../../application/catalog/read-models";
import type {
  PlaceResponse,
  RecipeDetailResponse,
  RecipeDiscoveryListResponse,
  RecipeListResponse,
} from "../../contracts/catalog";
import { PUBLISHED_STATUS, escapeLikePattern } from "../../domain/catalog";
import { isNullOrWhiteSpace, dotnetTrim } from "../../domain/text";
import { DATABASE, type SavoraDatabase } from "../db/database";
import { toContractTimestamp, toNullableContractTimestamp, toNullableNumber } from "../db/pg-values";
import {
  mediaAssets,
  placeNames,
  places,
  recipeIngredientLines,
  recipeMediaAssociations,
  recipePlaceAssociations,
  recipes,
  recipeSteps,
  recipeTranslations,
  recipeVersions,
  sourceAttributions,
} from "../db/schema";

interface Includes {
  ingredients: boolean;
  steps: boolean;
  sources: boolean;
  places: boolean;
  media: boolean;
}

const SUMMARY_INCLUDES: Includes = { ingredients: false, steps: false, sources: false, places: false, media: false };
const DISCOVERY_INCLUDES: Includes = { ingredients: true, steps: false, sources: true, places: true, media: true };
const DETAIL_INCLUDES: Includes = { ingredients: true, steps: true, sources: true, places: true, media: true };

// EF.Functions.ILike(value, pattern, "\\") translates to ILIKE ... ESCAPE '\'.
function ilikeEscaped(column: AnyPgColumn, pattern: string): SQL {
  return sql`${column} ILIKE ${pattern} ESCAPE '\\'`;
}

function groupBy<T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const value = key(row);
    const group = groups.get(value);
    if (group) group.push(row);
    else groups.set(value, [row]);
  }
  return groups;
}

@Injectable()
export class DrizzleCatalogQueries implements CatalogQueries {
  constructor(@Inject(DATABASE) private readonly db: SavoraDatabase) {}

  async listRecipes(locale: string, query: string | undefined, limit: number): Promise<RecipeListResponse> {
    const conditions: SQL[] = [eq(recipes.status, PUBLISHED_STATUS), isNotNull(recipes.currentVersionId)];
    if (!isNullOrWhiteSpace(query)) {
      const pattern = `%${escapeLikePattern(dotnetTrim(query!))}%`;
      conditions.push(this.translationMatches(pattern));
    }

    const page = await this.selectRecipePage(conditions, limit);
    const aggregates = await this.loadAggregates(page, SUMMARY_INCLUDES);
    return { items: aggregates.map((aggregate) => toRecipeSummary(aggregate, locale)) };
  }

  async listDiscoveryRecipes(
    locale: string,
    query: string | undefined,
    limit: number,
    offset = 0,
  ): Promise<RecipeDiscoveryListResponse> {
    const conditions: SQL[] = [eq(recipes.status, PUBLISHED_STATUS), isNotNull(recipes.currentVersionId)];
    if (!isNullOrWhiteSpace(query)) {
      const pattern = `%${escapeLikePattern(dotnetTrim(query!))}%`;
      conditions.push(or(this.translationMatches(pattern), this.ingredientMatches(pattern))!);
    }

    const page = await this.selectRecipePage(conditions, limit, offset);
    const aggregates = await this.loadAggregates(page, DISCOVERY_INCLUDES);
    const localizations = await this.acceptedLocalizations(page, locale);
    return { items: aggregates.map((aggregate) => applyCatalogLocalization(toDiscoverySummary(aggregate, locale), localizations.get(aggregate.recipe.currentVersionId ?? ""), locale)) };
  }

  async getRecipe(slug: string, locale: string): Promise<RecipeDetailResponse | null> {
    const rows = await this.db
      .select({
        id: recipes.id,
        slug: recipes.slug,
        publishedAt: recipes.publishedAt,
        currentVersionId: recipes.currentVersionId,
      })
      .from(recipes)
      .where(and(eq(recipes.status, PUBLISHED_STATUS), eq(recipes.slug, slug)))
      .limit(2);

    if (rows.length > 1) throw new Error("Sequence contains more than one element (recipe slug).");
    const recipe = rows[0];
    if (recipe === undefined) return null;

    const [aggregate] = await this.loadAggregates([this.toRecipeRow(recipe)], DETAIL_INCLUDES);
    if (aggregate === undefined || aggregate.version === null) return null;
    const localized = await this.acceptedLocalizations([aggregate.recipe], locale);
    return applyCatalogLocalization(toRecipeDetail(aggregate, locale), localized.get(aggregate.recipe.currentVersionId ?? ""), locale);
  }

  private async acceptedLocalizations(page: RecipeRow[], locale: string): Promise<Map<string, unknown>> {
    if (!["zh", "ja", "fr", "it", "es"].includes(locale) || !page.length) return new Map();
    const ids = page.flatMap(recipe => recipe.currentVersionId ? [recipe.currentVersionId] : []);
    const rows = await this.db.execute(sql`SELECT l.recipe_version_id,l.payload FROM recipe_localizations l
      JOIN translation_runs r ON r.id=l.run_id WHERE l.state='Accepted' AND r.state='Accepted'
      AND l.locale=${locale} AND l.recipe_version_id IN (${sql.join(ids.map(id => sql`${id}::uuid`), sql`,`)})`);
    return new Map(rows.rows.map(row => [row.recipe_version_id as string, row.payload]));
  }

  async getPlace(slug: string, locale: string): Promise<PlaceResponse | null> {
    const rows = await this.db.select().from(places).where(eq(places.slug, slug)).limit(2);
    if (rows.length > 1) throw new Error("Sequence contains more than one element (place slug).");
    const place = rows[0];
    if (place === undefined) return null;

    const loaded = await this.loadPlaces([place.id]);
    const row = loaded.get(place.id);
    if (row === undefined || row.names.length === 0) return null;
    return toPlaceResponse(row, locale);
  }

  private translationMatches(pattern: string): SQL {
    return exists(
      this.db
        .select({ one: sql`1` })
        .from(recipeTranslations)
        .where(
          and(
            eq(recipeTranslations.recipeVersionId, recipes.currentVersionId),
            or(ilikeEscaped(recipeTranslations.title, pattern), ilikeEscaped(recipeTranslations.summary, pattern)),
          ),
        ),
    );
  }

  private ingredientMatches(pattern: string): SQL {
    return exists(
      this.db
        .select({ one: sql`1` })
        .from(recipeIngredientLines)
        .where(
          and(
            eq(recipeIngredientLines.recipeVersionId, recipes.currentVersionId),
            ilikeEscaped(recipeIngredientLines.name, pattern),
          ),
        ),
    );
  }

  /** OrderByDescending(PublishedAt).ThenBy(Slug).Take(limit), evaluated by PostgreSQL as EF does. */
  private async selectRecipePage(conditions: SQL[], limit: number, offset = 0): Promise<RecipeRow[]> {
    const rows = await this.db
      .select({
        id: recipes.id,
        slug: recipes.slug,
        publishedAt: recipes.publishedAt,
        currentVersionId: recipes.currentVersionId,
      })
      .from(recipes)
      .where(and(...conditions))
      .orderBy(desc(recipes.publishedAt), asc(recipes.slug))
      .limit(limit).offset(offset);
    return rows.map((row) => this.toRecipeRow(row));
  }

  private toRecipeRow(row: {
    id: string;
    slug: string;
    publishedAt: string | null;
    currentVersionId: string | null;
  }): RecipeRow {
    return {
      id: row.id,
      slug: row.slug,
      publishedAt: toNullableContractTimestamp(row.publishedAt),
      currentVersionId: row.currentVersionId,
    };
  }

  private async loadAggregates(page: RecipeRow[], includes: Includes): Promise<RecipeAggregate[]> {
    if (page.length === 0) return [];

    const recipeIds = page.map((recipe) => recipe.id);
    const versionIds = page.flatMap((recipe) => (recipe.currentVersionId === null ? [] : [recipe.currentVersionId]));

    const [versions, translations, ingredients, steps, sources, placeAssociations, mediaAssociations] =
      await Promise.all([
        this.loadVersions(versionIds),
        this.loadTranslations(versionIds),
        includes.ingredients ? this.loadIngredients(versionIds) : Promise.resolve([]),
        includes.steps ? this.loadSteps(versionIds) : Promise.resolve([]),
        includes.sources ? this.loadSources(versionIds) : Promise.resolve([]),
        includes.places ? this.loadPlaceAssociations(recipeIds) : Promise.resolve([]),
        includes.media ? this.loadMediaAssociations(recipeIds) : Promise.resolve([]),
      ]);

    const versionsById = new Map(versions.map((version) => [version.id, version]));
    const translationsByVersion = groupBy(translations, (row) => row.recipeVersionId);
    const ingredientsByVersion = groupBy(ingredients, (row) => row.recipeVersionId);
    const stepsByVersion = groupBy(steps, (row) => row.recipeVersionId);
    const sourcesByVersion = groupBy(sources, (row) => row.recipeVersionId);
    const placesByRecipe = groupBy(placeAssociations, (row) => row.recipeId);
    const mediaByRecipe = groupBy(mediaAssociations, (row) => row.recipeId);

    return page.map((recipe) => {
      const versionId = recipe.currentVersionId ?? "";
      return {
        recipe,
        version: versionsById.get(versionId) ?? null,
        translations: translationsByVersion.get(versionId) ?? [],
        ingredients: ingredientsByVersion.get(versionId) ?? [],
        steps: stepsByVersion.get(versionId) ?? [],
        sources: sourcesByVersion.get(versionId) ?? [],
        placeAssociations: placesByRecipe.get(recipe.id) ?? [],
        mediaAssociations: mediaByRecipe.get(recipe.id) ?? [],
      };
    });
  }

  private async loadVersions(versionIds: string[]): Promise<RecipeVersionRow[]> {
    if (versionIds.length === 0) return [];
    return this.db
      .select({
        id: recipeVersions.id,
        versionNumber: recipeVersions.versionNumber,
        originalLocale: recipeVersions.originalLocale,
        servings: recipeVersions.servings,
        preparationMinutes: recipeVersions.preparationMinutes,
        cookingMinutes: recipeVersions.cookingMinutes,
      })
      .from(recipeVersions)
      .where(inArray(recipeVersions.id, versionIds));
  }

  private async loadTranslations(versionIds: string[]): Promise<RecipeTranslationRow[]> {
    if (versionIds.length === 0) return [];
    return this.db
      .select({
        id: recipeTranslations.id,
        recipeVersionId: recipeTranslations.recipeVersionId,
        locale: recipeTranslations.locale,
        title: recipeTranslations.title,
        summary: recipeTranslations.summary,
        culturalNote: recipeTranslations.culturalNote,
      })
      .from(recipeTranslations)
      .where(inArray(recipeTranslations.recipeVersionId, versionIds))
      .orderBy(asc(recipeTranslations.recipeVersionId), asc(recipeTranslations.id));
  }

  private async loadIngredients(versionIds: string[]): Promise<IngredientLineRow[]> {
    if (versionIds.length === 0) return [];
    const rows = await this.db
      .select({
        id: recipeIngredientLines.id,
        recipeVersionId: recipeIngredientLines.recipeVersionId,
        position: recipeIngredientLines.position,
        name: recipeIngredientLines.name,
        quantity: recipeIngredientLines.quantity,
        unit: recipeIngredientLines.unit,
        preparationNote: recipeIngredientLines.preparationNote,
      })
      .from(recipeIngredientLines)
      .where(inArray(recipeIngredientLines.recipeVersionId, versionIds))
      .orderBy(asc(recipeIngredientLines.recipeVersionId), asc(recipeIngredientLines.id));
    return rows.map((row) => ({ ...row, quantity: toNullableNumber(row.quantity) }));
  }

  private async loadSteps(versionIds: string[]): Promise<RecipeStepRow[]> {
    if (versionIds.length === 0) return [];
    return this.db
      .select({
        id: recipeSteps.id,
        recipeVersionId: recipeSteps.recipeVersionId,
        position: recipeSteps.position,
        title: recipeSteps.title,
        instruction: recipeSteps.instruction,
        durationMinutes: recipeSteps.durationMinutes,
      })
      .from(recipeSteps)
      .where(inArray(recipeSteps.recipeVersionId, versionIds))
      .orderBy(asc(recipeSteps.recipeVersionId), asc(recipeSteps.id));
  }

  private async loadSources(versionIds: string[]): Promise<SourceAttributionRow[]> {
    if (versionIds.length === 0) return [];
    const rows = await this.db
      .select({
        id: sourceAttributions.id,
        recipeVersionId: sourceAttributions.recipeVersionId,
        sourceUrl: sourceAttributions.sourceUrl,
        sourceName: sourceAttributions.sourceName,
        licenseCode: sourceAttributions.licenseCode,
        retrievedAt: sourceAttributions.retrievedAt,
        externalId: sourceAttributions.externalId,
      })
      .from(sourceAttributions)
      .where(inArray(sourceAttributions.recipeVersionId, versionIds))
      .orderBy(asc(sourceAttributions.recipeVersionId), asc(sourceAttributions.id));
    return rows.map((row) => ({ ...row, retrievedAt: toContractTimestamp(row.retrievedAt) }));
  }

  private async loadPlaceAssociations(recipeIds: string[]): Promise<RecipePlaceAssociationRow[]> {
    if (recipeIds.length === 0) return [];
    const associations = await this.db
      .select({
        recipeId: recipePlaceAssociations.recipeId,
        placeId: recipePlaceAssociations.placeId,
        relationType: recipePlaceAssociations.relationType,
        isPrimary: recipePlaceAssociations.isPrimary,
      })
      .from(recipePlaceAssociations)
      .where(inArray(recipePlaceAssociations.recipeId, recipeIds))
      .orderBy(
        asc(recipePlaceAssociations.recipeId),
        asc(recipePlaceAssociations.placeId),
        asc(recipePlaceAssociations.relationType),
      );

    const placesById = await this.loadPlaces([...new Set(associations.map((row) => row.placeId))]);
    return associations.map((association) => {
      const place = placesById.get(association.placeId);
      if (place === undefined) throw new Error(`Place '${association.placeId}' referenced by a recipe was not found.`);
      return {
        recipeId: association.recipeId,
        relationType: association.relationType,
        isPrimary: association.isPrimary,
        place,
      };
    });
  }

  private async loadPlaces(placeIds: string[]): Promise<Map<string, PlaceRow>> {
    if (placeIds.length === 0) return new Map();
    const [placeRows, nameRows] = await Promise.all([
      this.db.select().from(places).where(inArray(places.id, placeIds)),
      this.db
        .select()
        .from(placeNames)
        .where(inArray(placeNames.placeId, placeIds))
        .orderBy(asc(placeNames.placeId), asc(placeNames.id)),
    ]);
    const namesByPlace = groupBy<PlaceNameRow>(nameRows, (row) => row.placeId);
    return new Map(
      placeRows.map((place) => [
        place.id,
        {
          id: place.id,
          slug: place.slug,
          type: place.type,
          latitude: place.latitude,
          longitude: place.longitude,
          wikidataId: place.wikidataId,
          names: namesByPlace.get(place.id) ?? [],
        },
      ]),
    );
  }

  private async loadMediaAssociations(recipeIds: string[]): Promise<RecipeMediaAssociationRow[]> {
    if (recipeIds.length === 0) return [];
    const rows = await this.db
      .select({
        recipeId: recipeMediaAssociations.recipeId,
        isPrimary: recipeMediaAssociations.isPrimary,
        media: {
          id: mediaAssets.id,
          storageKey: mediaAssets.storageKey,
          sourceUrl: mediaAssets.sourceUrl,
          contentType: mediaAssets.contentType,
          altText: mediaAssets.altText,
          creator: mediaAssets.creator,
          licenseCode: mediaAssets.licenseCode,
          licenseUrl: mediaAssets.licenseUrl,
          provider: mediaAssets.provider,
          externalId: mediaAssets.externalId,
          width: mediaAssets.width,
          height: mediaAssets.height,
          rightsStatus: mediaAssets.rightsStatus,
        },
      })
      .from(recipeMediaAssociations)
      .innerJoin(mediaAssets, eq(mediaAssets.id, recipeMediaAssociations.mediaAssetId))
      .where(inArray(recipeMediaAssociations.recipeId, recipeIds))
      .orderBy(asc(recipeMediaAssociations.recipeId), asc(recipeMediaAssociations.position));
    return rows.map((row) => ({ recipeId: row.recipeId, isPrimary: row.isPrimary, media: row.media as MediaAssetRow }));
  }
}
