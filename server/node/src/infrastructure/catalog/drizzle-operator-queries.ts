// Ports Savora.Infrastructure.Catalog.EfOperatorCatalogQueries (Development-only Draft review).
//
// EF loads these aggregates with split queries whose ORDER BY covers only the parent keys
// (recipe id, version id). Row order inside a version is therefore whatever PostgreSQL
// returns, and it is observable: Distinct(OrdinalIgnoreCase) over provider names keeps the
// first spelling, and stable in-memory sorts keep ties in row order. The queries below keep
// EF's shapes (joins through recipes/recipe_versions, "= ANY(uuid[])" keys, the same ORDER BY)
// so PostgreSQL chooses the same plans.
import { Inject, Injectable } from "@nestjs/common";
import { and, asc, count, desc, eq, exists, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { OperatorCatalogQueries } from "../../application/catalog/operator-queries";
import { toOperatorDetail, toOperatorSummary } from "../../application/catalog/operator-projection";
import type {
  IngredientLineRow,
  MediaAssetRow,
  OperatorMediaAssociationRow,
  OperatorRecipeAggregate,
  OperatorRecipeRow,
  OperatorVersionAggregate,
  PlaceNameRow,
  RecipePlaceAssociationRow,
  RecipeStepRow,
  RecipeTranslationRow,
  RecipeVersionRow,
  SourceAttributionRow,
} from "../../application/catalog/read-models";
import type { OperatorRecipeDetailResponse, OperatorRecipeListResponse } from "../../contracts/operator";
import { DRAFT_STATUS, escapeLikePattern } from "../../domain/catalog";
import { dotnetTrim, isNullOrWhiteSpace } from "../../domain/text";
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

// EF.Functions.ILike(value, pattern, "\\") -> ILIKE ... ESCAPE '\'
function ilikeEscaped(column: AnyPgColumn, pattern: string): SQL {
  return sql`${column} ILIKE ${pattern} ESCAPE '\\'`;
}

// EF.Functions.ILike(value, pattern) without an escape character: Npgsql emits ESCAPE '',
// so '%' and '_' in the provider act as wildcards and '\' is literal.
function ilikeUnescaped(column: AnyPgColumn, pattern: string): SQL {
  return sql`${column} ILIKE ${pattern} ESCAPE ''`;
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

const recipeColumns = {
  id: recipes.id,
  slug: recipes.slug,
  status: recipes.status,
  currentVersionId: recipes.currentVersionId,
  createdAt: recipes.createdAt,
  updatedAt: recipes.updatedAt,
  publishedAt: recipes.publishedAt,
};

const versionColumns = {
  id: recipeVersions.id,
  recipeId: recipeVersions.recipeId,
  versionNumber: recipeVersions.versionNumber,
  originalLocale: recipeVersions.originalLocale,
  servings: recipeVersions.servings,
  preparationMinutes: recipeVersions.preparationMinutes,
  cookingMinutes: recipeVersions.cookingMinutes,
};

const translationColumns = {
  id: recipeTranslations.id,
  recipeVersionId: recipeTranslations.recipeVersionId,
  locale: recipeTranslations.locale,
  title: recipeTranslations.title,
  summary: recipeTranslations.summary,
  culturalNote: recipeTranslations.culturalNote,
};

const ingredientColumns = {
  id: recipeIngredientLines.id,
  recipeVersionId: recipeIngredientLines.recipeVersionId,
  position: recipeIngredientLines.position,
  name: recipeIngredientLines.name,
  quantity: recipeIngredientLines.quantity,
  unit: recipeIngredientLines.unit,
  preparationNote: recipeIngredientLines.preparationNote,
};

const stepColumns = {
  id: recipeSteps.id,
  recipeVersionId: recipeSteps.recipeVersionId,
  position: recipeSteps.position,
  title: recipeSteps.title,
  instruction: recipeSteps.instruction,
  durationMinutes: recipeSteps.durationMinutes,
};

const sourceColumns = {
  id: sourceAttributions.id,
  recipeVersionId: sourceAttributions.recipeVersionId,
  sourceUrl: sourceAttributions.sourceUrl,
  sourceName: sourceAttributions.sourceName,
  licenseCode: sourceAttributions.licenseCode,
  retrievedAt: sourceAttributions.retrievedAt,
  externalId: sourceAttributions.externalId,
};

/** The recipes a load covers: a table or the single-recipe subquery, its id column and filter. */
type ScopedFrom = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  id: any;
  where: SQL | undefined;
};

@Injectable()
export class DrizzleOperatorCatalogQueries implements OperatorCatalogQueries {
  constructor(@Inject(DATABASE) private readonly db: SavoraDatabase) {}

  async listDraftRecipes(
    locale: string,
    query: string | undefined,
    provider: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<OperatorRecipeListResponse> {
    const conditions: SQL[] = [eq(recipes.status, DRAFT_STATUS)];
    if (!isNullOrWhiteSpace(query)) {
      const pattern = `%${escapeLikePattern(dotnetTrim(query!))}%`;
      conditions.push(this.queryMatches(pattern));
    }
    if (!isNullOrWhiteSpace(provider)) {
      conditions.push(this.providerMatches(dotnetTrim(provider!)));
    }

    const [{ total }] = (await this.db
      .select({ total: sql<number>`count(*)::int` })
      .from(recipes)
      .where(and(...conditions))) as [{ total: number }];

    const idRows = await this.db
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(...conditions))
      .orderBy(desc(recipes.updatedAt), asc(recipes.slug))
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    const recipeIds = idRows.map((row) => row.id);

    const totalPages = total === 0 ? 0 : Math.floor((total + pageSize - 1) / pageSize);
    if (recipeIds.length === 0) return { page, pageSize, totalItems: total, totalPages, items: [] };

    const scope: ScopedFrom = {
      from: recipes,
      id: recipes.id,
      where: sql`${recipes.id} = ANY(${sql.param(recipeIds)}::uuid[])`,
    };
    const aggregates = await this.loadAggregates(scope, false);
    const order = new Map(recipeIds.map((id, index) => [id, index]));
    const items = aggregates
      .sort((a, b) => order.get(a.recipe.id)! - order.get(b.recipe.id)!)
      .map((aggregate) => toOperatorSummary(aggregate, locale));

    return { page, pageSize, totalItems: total, totalPages, items };
  }

  async getDraftRecipe(slug: string, locale: string): Promise<OperatorRecipeDetailResponse | null> {
    const draftBySlug = and(eq(recipes.status, DRAFT_STATUS), eq(recipes.slug, slug));
    const target = this.db
      .select({ targetId: recipes.id })
      .from(recipes)
      .where(draftBySlug)
      .orderBy(asc(recipes.id))
      .limit(1)
      .as("target");

    const aggregates = await this.loadAggregates(
      { from: target, id: target.targetId, where: undefined },
      true,
      draftBySlug,
    );
    if (aggregates.length > 1) throw new Error("Sequence contains more than one element (draft recipe slug).");
    const aggregate = aggregates[0];
    return aggregate === undefined ? null : toOperatorDetail(aggregate, locale);
  }

  // Slug, or any version's translation title/summary, or any version's ingredient name.
  private queryMatches(pattern: string): SQL {
    const versionMatches = exists(
      this.db
        .select({ one: sql`1` })
        .from(recipeVersions)
        .where(
          and(
            eq(recipes.id, recipeVersions.recipeId),
            or(
              exists(
                this.db
                  .select({ one: sql`1` })
                  .from(recipeTranslations)
                  .where(
                    and(
                      eq(recipeVersions.id, recipeTranslations.recipeVersionId),
                      or(ilikeEscaped(recipeTranslations.title, pattern), ilikeEscaped(recipeTranslations.summary, pattern)),
                    ),
                  ),
              ),
              exists(
                this.db
                  .select({ one: sql`1` })
                  .from(recipeIngredientLines)
                  .where(
                    and(
                      eq(recipeVersions.id, recipeIngredientLines.recipeVersionId),
                      ilikeEscaped(recipeIngredientLines.name, pattern),
                    ),
                  ),
              ),
            ),
          ),
        ),
    );
    return or(ilikeEscaped(recipes.slug, pattern), versionMatches)!;
  }

  // Any version's source name, or any associated media asset's provider.
  private providerMatches(provider: string): SQL {
    return or(
      exists(
        this.db
          .select({ one: sql`1` })
          .from(recipeVersions)
          .where(
            and(
              eq(recipes.id, recipeVersions.recipeId),
              exists(
                this.db
                  .select({ one: sql`1` })
                  .from(sourceAttributions)
                  .where(
                    and(
                      eq(recipeVersions.id, sourceAttributions.recipeVersionId),
                      ilikeUnescaped(sourceAttributions.sourceName, provider),
                    ),
                  ),
              ),
            ),
          ),
      ),
      exists(
        this.db
          .select({ one: sql`1` })
          .from(recipeMediaAssociations)
          .innerJoin(mediaAssets, eq(recipeMediaAssociations.mediaAssetId, mediaAssets.id))
          .where(and(eq(recipes.id, recipeMediaAssociations.recipeId), ilikeUnescaped(mediaAssets.provider, provider))),
      ),
    )!;
  }

  /**
   * Loads recipes in scope with all versions (translations, ingredients, steps, sources),
   * place associations (with places and names when requested) and media, one query per
   * collection as EF's AsSplitQuery() does.
   */
  private async loadAggregates(scope: ScopedFrom, withPlaces: boolean, recipeWhere?: SQL): Promise<OperatorRecipeAggregate[]> {
    const db = this.db;
    const scopedRecipes = recipeWhere
      ? db.select(recipeColumns).from(recipes).where(recipeWhere).orderBy(asc(recipes.id)).limit(2)
      : db.select(recipeColumns).from(recipes).where(scope.where).orderBy(asc(recipes.id));

    const viaVersions = <T extends Record<string, unknown>>(
      columns: T,
      child: typeof recipeTranslations | typeof recipeIngredientLines | typeof recipeSteps | typeof sourceAttributions,
    ) =>
      db
        .select(columns as never)
        .from(scope.from)
        .innerJoin(recipeVersions, eq(scope.id, recipeVersions.recipeId))
        .innerJoin(child, eq(recipeVersions.id, child.recipeVersionId))
        .where(scope.where)
        .orderBy(asc(scope.id), asc(recipeVersions.id)) as unknown as Promise<Record<string, unknown>[]>;

    const placeSubquery = db
      .select({
        paRecipeId: recipePlaceAssociations.recipeId,
        paPlaceId: recipePlaceAssociations.placeId,
        paRelationType: recipePlaceAssociations.relationType,
        paIsPrimary: recipePlaceAssociations.isPrimary,
        pId: places.id,
        pLatitude: places.latitude,
        pLongitude: places.longitude,
        pSlug: places.slug,
        pType: places.type,
        pWikidataId: places.wikidataId,
      })
      .from(recipePlaceAssociations)
      .innerJoin(places, eq(recipePlaceAssociations.placeId, places.id))
      .as("pa");

    const mediaSubquery = db
      .select({
        maRecipeId: recipeMediaAssociations.recipeId,
        maMediaAssetId: recipeMediaAssociations.mediaAssetId,
        maIsPrimary: recipeMediaAssociations.isPrimary,
        maPosition: recipeMediaAssociations.position,
        mId: mediaAssets.id,
        mAltText: mediaAssets.altText,
        mContentType: mediaAssets.contentType,
        mCreator: mediaAssets.creator,
        mExternalId: mediaAssets.externalId,
        mHeight: mediaAssets.height,
        mLicenseCode: mediaAssets.licenseCode,
        mLicenseUrl: mediaAssets.licenseUrl,
        mProvider: mediaAssets.provider,
        mRightsStatus: mediaAssets.rightsStatus,
        mSourceUrl: mediaAssets.sourceUrl,
        mStorageKey: mediaAssets.storageKey,
        mWidth: mediaAssets.width,
      })
      .from(recipeMediaAssociations)
      .innerJoin(mediaAssets, eq(recipeMediaAssociations.mediaAssetId, mediaAssets.id))
      .as("ma");

    const placeRowsQuery = withPlaces
      ? db
          .select({
            recipeId: placeSubquery.paRecipeId,
            placeId: placeSubquery.paPlaceId,
            relationType: placeSubquery.paRelationType,
            isPrimary: placeSubquery.paIsPrimary,
            id: placeSubquery.pId,
            latitude: placeSubquery.pLatitude,
            longitude: placeSubquery.pLongitude,
            slug: placeSubquery.pSlug,
            type: placeSubquery.pType,
            wikidataId: placeSubquery.pWikidataId,
          })
          .from(scope.from)
          .innerJoin(placeSubquery, eq(scope.id, placeSubquery.paRecipeId))
          .where(scope.where)
          .orderBy(
            asc(scope.id),
            asc(placeSubquery.paRecipeId),
            asc(placeSubquery.paPlaceId),
            asc(placeSubquery.paRelationType),
            asc(placeSubquery.pId),
          )
      : db
          .select({ recipeId: recipePlaceAssociations.recipeId, placeCount: count() })
          .from(scope.from)
          .innerJoin(recipePlaceAssociations, eq(scope.id, recipePlaceAssociations.recipeId))
          .where(scope.where)
          .groupBy(recipePlaceAssociations.recipeId);

    const [recipeRows, versionRows, translationRows, ingredientRows, stepRows, sourceRows, placeRows, mediaRows] =
      await Promise.all([
        scopedRecipes,
        db
          .select(versionColumns)
          .from(scope.from)
          .innerJoin(recipeVersions, eq(scope.id, recipeVersions.recipeId))
          .where(scope.where)
          .orderBy(asc(scope.id), asc(recipeVersions.id)),
        viaVersions(translationColumns, recipeTranslations),
        viaVersions(ingredientColumns, recipeIngredientLines),
        viaVersions(stepColumns, recipeSteps),
        viaVersions(sourceColumns, sourceAttributions),
        placeRowsQuery as Promise<Record<string, unknown>[]>,
        db
          .select({
            recipeId: mediaSubquery.maRecipeId,
            position: mediaSubquery.maPosition,
            isPrimary: mediaSubquery.maIsPrimary,
            id: mediaSubquery.mId,
            storageKey: mediaSubquery.mStorageKey,
            sourceUrl: mediaSubquery.mSourceUrl,
            contentType: mediaSubquery.mContentType,
            altText: mediaSubquery.mAltText,
            creator: mediaSubquery.mCreator,
            licenseCode: mediaSubquery.mLicenseCode,
            licenseUrl: mediaSubquery.mLicenseUrl,
            provider: mediaSubquery.mProvider,
            externalId: mediaSubquery.mExternalId,
            width: mediaSubquery.mWidth,
            height: mediaSubquery.mHeight,
            rightsStatus: mediaSubquery.mRightsStatus,
          })
          .from(scope.from)
          .innerJoin(mediaSubquery, eq(scope.id, mediaSubquery.maRecipeId))
          .where(scope.where)
          .orderBy(asc(scope.id)),
      ]);

    const translations = translationRows as unknown as RecipeTranslationRow[];
    const ingredients = (ingredientRows as unknown as (Omit<IngredientLineRow, "quantity"> & { quantity: string | null })[]).map(
      (row): IngredientLineRow => ({ ...row, quantity: toNullableNumber(row.quantity) }),
    );
    const steps = stepRows as unknown as RecipeStepRow[];
    const sources = (sourceRows as unknown as SourceAttributionRow[]).map((row) => ({
      ...row,
      retrievedAt: toContractTimestamp(row.retrievedAt),
    }));

    const translationsByVersion = groupBy(translations, (row) => row.recipeVersionId);
    const ingredientsByVersion = groupBy(ingredients, (row) => row.recipeVersionId);
    const stepsByVersion = groupBy(steps, (row) => row.recipeVersionId);
    const sourcesByVersion = groupBy(sources, (row) => row.recipeVersionId);
    const versionsByRecipe = groupBy(versionRows, (row) => row.recipeId);

    let placesByRecipe = new Map<string, RecipePlaceAssociationRow[]>();
    const placeCounts = new Map<string, number>();
    if (withPlaces) {
      const rows = placeRows as {
        recipeId: string;
        relationType: string;
        isPrimary: boolean;
        id: string;
        latitude: number | null;
        longitude: number | null;
        slug: string;
        type: string;
        wikidataId: string | null;
      }[];
      const names = await this.loadPlaceNames([...new Set(rows.map((row) => row.id))]);
      placesByRecipe = groupBy(
        rows.map((row) => ({
          recipeId: row.recipeId,
          relationType: row.relationType,
          isPrimary: row.isPrimary,
          place: {
            id: row.id,
            slug: row.slug,
            type: row.type,
            latitude: row.latitude,
            longitude: row.longitude,
            wikidataId: row.wikidataId,
            names: names.get(row.id) ?? [],
          },
        })),
        (row) => row.recipeId,
      );
      for (const [recipeId, associations] of placesByRecipe) placeCounts.set(recipeId, associations.length);
    } else {
      for (const row of placeRows as { recipeId: string; placeCount: number }[]) {
        placeCounts.set(row.recipeId, Number(row.placeCount));
      }
    }

    const mediaByRecipe = groupBy(
      mediaRows.map((row) => ({
        recipeId: row.recipeId,
        association: {
          position: row.position,
          isPrimary: row.isPrimary,
          media: {
            id: row.id,
            storageKey: row.storageKey,
            sourceUrl: row.sourceUrl,
            contentType: row.contentType,
            altText: row.altText,
            creator: row.creator,
            licenseCode: row.licenseCode,
            licenseUrl: row.licenseUrl,
            provider: row.provider,
            externalId: row.externalId,
            width: row.width,
            height: row.height,
            rightsStatus: row.rightsStatus,
          } satisfies MediaAssetRow,
        } satisfies OperatorMediaAssociationRow,
      })),
      (row) => row.recipeId,
    );

    return recipeRows.map((row): OperatorRecipeAggregate => {
      const recipe: OperatorRecipeRow = {
        id: row.id,
        slug: row.slug,
        status: row.status,
        currentVersionId: row.currentVersionId,
        createdAt: toContractTimestamp(row.createdAt),
        updatedAt: toContractTimestamp(row.updatedAt),
        publishedAt: toNullableContractTimestamp(row.publishedAt),
      };
      const versions = (versionsByRecipe.get(row.id) ?? []).map(
        (version): OperatorVersionAggregate => ({
          version: version satisfies RecipeVersionRow,
          translations: translationsByVersion.get(version.id) ?? [],
          ingredients: ingredientsByVersion.get(version.id) ?? [],
          steps: stepsByVersion.get(version.id) ?? [],
          sources: sourcesByVersion.get(version.id) ?? [],
        }),
      );
      return {
        recipe,
        versions,
        placeAssociations: placesByRecipe.get(row.id) ?? [],
        placeAssociationCount: placeCounts.get(row.id) ?? 0,
        mediaAssociations: (mediaByRecipe.get(row.id) ?? []).map((media) => media.association),
      };
    });
  }

  private async loadPlaceNames(placeIds: string[]): Promise<Map<string, PlaceNameRow[]>> {
    if (placeIds.length === 0) return new Map();
    const rows = await this.db
      .select()
      .from(placeNames)
      .where(sql`${placeNames.placeId} = ANY(${sql.param(placeIds)}::uuid[])`)
      .orderBy(asc(placeNames.placeId), asc(placeNames.id));
    return groupBy<PlaceNameRow>(rows, (row) => row.placeId);
  }
}
