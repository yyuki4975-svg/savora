// EF-style unit of work for the offline tools: aggregates are added or loaded (tracked), and
// saveChanges() writes new rows, modified rows and removed media links in foreign-key order,
// inside the caller's transaction. A failure surfaces as the DbUpdateException EF would raise.
import { eq, sql, type SQL } from "drizzle-orm";
import { formatDotnetDecimal } from "../../domain/dotnet/decimal";
import { DotnetException } from "../../domain/dotnet/errors";
import { toPostgresTimestamptz, type Instant } from "../../domain/dotnet/instant";
import { MediaReviewImport, RecipePublicationAudit } from "../../domain/model/editorial";
import { MediaAsset } from "../../domain/model/media";
import { Place } from "../../domain/model/place";
import { Recipe } from "../../domain/model/recipe";
import {
  mediaAssets,
  mediaReviewDecisions,
  mediaReviewImports,
  placeNames,
  places,
  recipeIngredientLines,
  recipeMediaAssociations,
  recipePlaceAssociations,
  recipePublicationAudits,
  recipes,
  recipeSteps,
  recipeTranslations,
  recipeVersions,
  sourceAttributions,
} from "../db/schema";
import { type ToolSession, toSaveChangesError } from "./tool-database";

/**
 * Npgsql only writes DateTimeOffset values with offset 0 to timestamptz; any other offset fails the save
 * (the C# tools surface it as a DbUpdateException).
 */
function ts(value: Instant): string {
  if (value.offsetMinutes !== 0) {
    const sign = value.offsetMinutes < 0 ? "-" : "";
    const minutes = Math.abs(value.offsetMinutes);
    const span = `${sign}${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
    throw new DotnetException(
      "System.ArgumentException",
      `Cannot write DateTimeOffset with Offset=${span} to PostgreSQL type 'timestamp with time zone', only offset 0 (UTC) is supported.`,
    );
  }
  return toPostgresTimestamptz(value);
}
const tsOrNull = (value: Instant | null) => (value === null ? null : ts(value));

/** node-postgres sends -0 as "0"; Npgsql sends the IEEE value, so keep the sign explicitly. */
function float8(value: number | null): number | SQL | null {
  return value !== null && Object.is(value, -0) ? sql`'-0'::double precision` : value;
}

const CHUNK = 400;

export class UnitOfWork {
  private readonly places: Place[] = [];
  private readonly recipes: Recipe[] = [];
  private readonly mediaAssets: MediaAsset[] = [];
  private readonly audits: RecipePublicationAudit[] = [];
  private readonly reviewImports: MediaReviewImport[] = [];

  constructor(private readonly session: ToolSession) {}

  addPlace(place: Place): void {
    this.places.push(place);
  }

  /** DbSet.Add / tracking of a loaded recipe aggregate. */
  trackRecipe(recipe: Recipe): void {
    if (!this.recipes.includes(recipe)) this.recipes.push(recipe);
  }

  trackMediaAsset(asset: MediaAsset): void {
    if (!this.mediaAssets.includes(asset)) this.mediaAssets.push(asset);
  }

  addAudit(audit: RecipePublicationAudit): void {
    this.audits.push(audit);
  }

  addReviewImport(reviewImport: MediaReviewImport): void {
    this.reviewImports.push(reviewImport);
  }

  async saveChanges(): Promise<void> {
    try {
      await this.write();
    } catch (error) {
      throw toSaveChangesError(error);
    }
  }

  private async insert<T>(table: Parameters<ToolSession["db"]["insert"]>[0], rows: T[]): Promise<void> {
    for (let start = 0; start < rows.length; start += CHUNK) {
      await this.session.db.insert(table).values(rows.slice(start, start + CHUNK) as never);
    }
  }

  private async write(): Promise<void> {
    const db = this.session.db;

    // 1. Media links removed by ReplacePrimaryMedia.
    for (const recipe of this.recipes) {
      for (const removed of recipe.removedMediaAssociations) {
        await db
          .delete(recipeMediaAssociations)
          .where(sql`${recipeMediaAssociations.recipeId} = ${removed.recipeId} AND ${recipeMediaAssociations.mediaAssetId} = ${removed.mediaAssetId}`);
      }
    }

    // 2. Places and their names.
    const newPlaces = this.places.filter((place) => place.isNew);
    await this.insert(
      places,
      newPlaces.map((place) => ({
        id: place.id,
        slug: place.slug,
        type: place.type,
        latitude: float8(place.latitude),
        longitude: float8(place.longitude),
        wikidataId: place.wikidataId,
      })),
    );
    await this.insert(
      placeNames,
      newPlaces.flatMap((place) => place.names.map((name) => ({ id: name.id, placeId: name.placeId, locale: name.locale, name: name.name }))),
    );

    // 3. Media assets.
    await this.insert(
      mediaAssets,
      this.mediaAssets.filter((asset) => asset.isNew).map((asset) => ({
        id: asset.id,
        storageKey: asset.storageKey,
        contentType: asset.contentType,
        altText: asset.altText,
        creator: asset.creator,
        licenseCode: asset.licenseCode,
        licenseUrl: asset.licenseUrl,
        provider: asset.provider,
        externalId: asset.externalId,
        sourceUrl: asset.sourceUrl,
        width: asset.width,
        height: asset.height,
        rightsStatus: asset.rightsStatus,
        createdAt: ts(asset.createdAt),
      })),
    );
    for (const asset of this.mediaAssets.filter((candidate) => !candidate.isNew && candidate.modified)) {
      await db.update(mediaAssets).set({ rightsStatus: asset.rightsStatus }).where(eq(mediaAssets.id, asset.id));
    }

    // 4. New recipes (a current version inserted in this same save is linked afterwards).
    const newRecipes = this.recipes.filter((recipe) => recipe.isNew);
    const newVersionIds = new Set(this.recipes.flatMap((recipe) => recipe.versions.filter((version) => version.isNew).map((version) => version.id)));
    await this.insert(
      recipes,
      newRecipes.map((recipe) => ({
        id: recipe.id,
        slug: recipe.slug,
        status: recipe.status,
        currentVersionId: recipe.currentVersionId !== null && newVersionIds.has(recipe.currentVersionId) ? null : recipe.currentVersionId,
        createdAt: ts(recipe.createdAt),
        updatedAt: ts(recipe.updatedAt),
        publishedAt: tsOrNull(recipe.publishedAt),
      })),
    );

    // 5. New versions and their children.
    const versions = this.recipes.flatMap((recipe) => recipe.versions.filter((version) => version.isNew));
    await this.insert(
      recipeVersions,
      versions.map((version) => ({
        id: version.id,
        recipeId: version.recipeId,
        versionNumber: version.versionNumber,
        originalLocale: version.originalLocale,
        servings: version.servings,
        preparationMinutes: version.preparationMinutes,
        cookingMinutes: version.cookingMinutes,
        createdAt: ts(version.createdAt),
      })),
    );
    const allVersions = this.recipes.flatMap((recipe) => recipe.versions);
    await this.insert(
      recipeTranslations,
      allVersions.flatMap((version) => version.translations.filter((item) => item.isNew)).map((item) => ({
        id: item.id,
        recipeVersionId: item.recipeVersionId,
        locale: item.locale,
        title: item.title,
        summary: item.summary,
        culturalNote: item.culturalNote,
        isMachineTranslated: item.isMachineTranslated,
      })),
    );
    await this.insert(
      recipeIngredientLines,
      allVersions.flatMap((version) => version.ingredients.filter((item) => item.isNew)).map((item) => ({
        id: item.id,
        recipeVersionId: item.recipeVersionId,
        position: item.position,
        name: item.name,
        quantity: item.quantity === null ? null : formatDotnetDecimal(item.quantity),
        unit: item.unit,
        preparationNote: item.preparationNote,
      })),
    );
    await this.insert(
      recipeSteps,
      allVersions.flatMap((version) => version.steps.filter((item) => item.isNew)).map((item) => ({
        id: item.id,
        recipeVersionId: item.recipeVersionId,
        position: item.position,
        title: item.title,
        instruction: item.instruction,
        durationMinutes: item.durationMinutes,
      })),
    );
    await this.insert(
      sourceAttributions,
      allVersions.flatMap((version) => version.sources.filter((item) => item.isNew)).map((item) => ({
        id: item.id,
        recipeVersionId: item.recipeVersionId,
        sourceUrl: item.sourceUrl,
        sourceName: item.sourceName,
        licenseCode: item.licenseCode,
        retrievedAt: ts(item.retrievedAt),
        externalId: item.externalId,
      })),
    );

    // 6. Recipe row updates (status transitions, current version, timestamps).
    for (const recipe of this.recipes) {
      const linkLater = recipe.isNew && recipe.currentVersionId !== null && newVersionIds.has(recipe.currentVersionId);
      if ((!recipe.isNew && recipe.modified) || linkLater) {
        await db
          .update(recipes)
          .set({
            status: recipe.status,
            currentVersionId: recipe.currentVersionId,
            updatedAt: ts(recipe.updatedAt),
            publishedAt: tsOrNull(recipe.publishedAt),
          })
          .where(eq(recipes.id, recipe.id));
      }
    }

    // 7. Associations.
    await this.insert(
      recipePlaceAssociations,
      this.recipes.flatMap((recipe) => recipe.placeAssociations.filter((item) => item.isNew)).map((item) => ({
        recipeId: item.recipeId,
        placeId: item.placeId,
        relationType: item.relationType,
        isPrimary: item.isPrimary,
      })),
    );
    await this.insert(
      recipeMediaAssociations,
      this.recipes.flatMap((recipe) => recipe.mediaAssociations.filter((item) => item.isNew)).map((item) => ({
        recipeId: item.recipeId,
        mediaAssetId: item.mediaAssetId,
        position: item.position,
        isPrimary: item.isPrimary,
      })),
    );

    // 8. Editorial records.
    await this.insert(
      recipePublicationAudits,
      this.audits.map((audit) => ({
        id: audit.id,
        recipeId: audit.recipeId,
        recipeVersionId: audit.recipeVersionId,
        basedOnVersion: audit.basedOnVersion,
        fromStatus: audit.fromStatus,
        toStatus: audit.toStatus,
        payloadSha256: audit.payloadSha256,
        reviewedBy: audit.reviewedBy,
        reviewNote: audit.reviewNote,
        mediaPolicy: audit.mediaPolicy,
        approvedAt: ts(audit.approvedAt),
        recordedAt: ts(audit.recordedAt),
      })),
    );
    await this.insert(
      mediaReviewImports,
      this.reviewImports.map((item) => ({
        id: item.id,
        batchId: item.batchId,
        scope: item.scope,
        payloadSha256: item.payloadSha256,
        manifestSha256: item.manifestSha256,
        exportedAt: ts(item.exportedAt),
        importedAt: ts(item.importedAt),
      })),
    );
    await this.insert(
      mediaReviewDecisions,
      this.reviewImports.flatMap((item) => item.decisions).map((decision) => ({
        reviewImportId: decision.reviewImportId,
        recipeId: decision.recipeId,
        candidateProviderId: decision.candidateProviderId,
        decision: decision.decision,
        recipeChecked: decision.recipeChecked,
        visualChecked: decision.visualChecked,
        rightsChecked: decision.rightsChecked,
        qualityChecked: decision.qualityChecked,
        note: decision.note,
      })),
    );

    this.acceptChanges();
  }

  /** After a successful SaveChanges every tracked entity is Unchanged. */
  private acceptChanges(): void {
    for (const place of this.places) place.isNew = false;
    for (const asset of this.mediaAssets) {
      asset.isNew = false;
      asset.modified = false;
    }
    for (const recipe of this.recipes) {
      recipe.isNew = false;
      recipe.modified = false;
      recipe.removedMediaAssociations.length = 0;
      for (const version of recipe.versions) {
        version.isNew = false;
        for (const item of [...version.translations, ...version.ingredients, ...version.steps, ...version.sources]) item.isNew = false;
      }
      for (const item of [...recipe.placeAssociations, ...recipe.mediaAssociations]) item.isNew = false;
    }
    this.audits.length = 0;
    this.reviewImports.length = 0;
  }
}

