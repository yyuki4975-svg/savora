// Port of Savora.Infrastructure.Seeding.CatalogSeedImporter: idempotent by stable IDs and slugs,
// one transaction, places saved first, recipes and media next, then Published recipes published.
import { inArray } from "drizzle-orm";
import { deref, invalidData, invalidOperation } from "../../../domain/dotnet/errors";
import {
  MEDIA_RIGHTS_STATUS,
  PLACE_TYPE,
  RECIPE_PLACE_RELATION_TYPE,
  enumName,
  parseEnum,
} from "../../../domain/dotnet/enum";
import { fromPostgresTimestamptz, type Instant } from "../../../domain/dotnet/instant";
import { MediaAsset, type MediaRightsStatus } from "../../../domain/model/media";
import { Place, type PlaceType } from "../../../domain/model/place";
import {
  Recipe,
  RecipeMediaAssociation,
  RecipePlaceAssociation,
  type PublicationStatus,
  type RecipePlaceRelationType,
} from "../../../domain/model/recipe";
import { mediaAssets, places, recipeMediaAssociations, recipePlaceAssociations, recipes } from "../../db/schema";
import type { ToolSession } from "../tool-database";
import { UnitOfWork } from "../unit-of-work";
import type { CatalogSeedPackage, CatalogSeedRecipe } from "./catalog-seed-package";

export interface CatalogSeedImportResult {
  recipesAdded: number;
  recipesSkipped: number;
  placesAdded: number;
  placesSkipped: number;
  associationsAdded: number;
  mediaAssetsAdded: number;
  mediaAssetsSkipped: number;
  mediaAssociationsAdded: number;
}

interface MediaIdentity {
  id: string;
  provider: string;
  externalId: string;
}

const identityKey = (provider: string | null, externalId: string | null) => `${provider}\u0000${externalId}`;

export async function importCatalogSeed(session: ToolSession, seed: CatalogSeedPackage): Promise<CatalogSeedImportResult> {
  const pending = await session.pendingMigrations();
  if (pending.length > 0) {
    throw invalidOperation(`Apply reviewed database migrations before seeding. Pending: ${pending.join(", ")}`);
  }

  return session.transaction(async () => {
    const db = session.db;
    const unit = new UnitOfWork(session);

    const existingPlaceRows = await db.select({ id: places.id, slug: places.slug }).from(places);
    const existingPlacesById = new Map(existingPlaceRows.map((place) => [place.id, place.slug]));
    const existingPlacesBySlug = new Map(existingPlaceRows.map((place) => [place.slug, place.id]));

    let placesAdded = 0;
    let placesSkipped = 0;
    for (const maybePlace of deref(seed.Places)) {
      const seedPlace = deref(maybePlace);
      const existingSlug = existingPlacesById.get(seedPlace.Id);
      const existingId = seedPlace.Slug === null ? undefined : existingPlacesBySlug.get(seedPlace.Slug);
      if (existingSlug !== undefined || existingId !== undefined) {
        if ((existingSlug !== undefined && existingSlug !== seedPlace.Slug) || (existingId !== undefined && existingId !== seedPlace.Id)) {
          throw invalidOperation(`Stable place identity conflict for '${seedPlace.Slug}' (${seedPlace.Id}).`);
        }
        placesSkipped++;
        continue;
      }

      const place = Place.create(
        deref(seedPlace.Slug),
        enumName(PLACE_TYPE, parseEnum(PLACE_TYPE, deref(seedPlace.Type))) as PlaceType,
        seedPlace.Latitude,
        seedPlace.Longitude,
        seedPlace.WikidataId,
        seedPlace.Id,
      );
      for (const name of deref(seedPlace.Names)) {
        place.addName(deref(deref(name).Locale), deref(deref(name).Name));
      }
      unit.addPlace(place);
      existingPlacesById.set(seedPlace.Id, deref(seedPlace.Slug));
      existingPlacesBySlug.set(deref(seedPlace.Slug), seedPlace.Id);
      placesAdded++;
    }

    await unit.saveChanges();

    const existingRecipes = await loadRecipesWithAssociations(session);
    const existingRecipesById = new Map(existingRecipes.map((recipe) => [recipe.id, recipe]));
    const existingRecipesBySlug = new Map(existingRecipes.map((recipe) => [recipe.slug, recipe]));
    existingRecipes.forEach((recipe) => unit.trackRecipe(recipe));

    let recipesAdded = 0;
    let recipesSkipped = 0;
    let associationsAdded = 0;
    let mediaAssetsAdded = 0;
    let mediaAssetsSkipped = 0;
    let mediaAssociationsAdded = 0;
    const recipesToPublish: Array<{ recipe: Recipe; publishedAt: Instant }> = [];

    const existingMediaRows = await db
      .select({ id: mediaAssets.id, provider: mediaAssets.provider, externalId: mediaAssets.externalId })
      .from(mediaAssets);
    const existingMediaById = new Map<string, MediaIdentity>(existingMediaRows.map((row) => [row.id, row]));
    const existingMediaByIdentity = new Map<string, MediaIdentity>(
      existingMediaRows.map((row) => [identityKey(row.provider, row.externalId), row]),
    );

    const importMedia = (seedRecipe: CatalogSeedRecipe, recipe: Recipe) => {
      for (const maybeMedia of seedRecipe.Media ?? []) {
        const seedMedia = deref(maybeMedia);
        const mediaById = existingMediaById.get(seedMedia.Id);
        const mediaByIdentity = existingMediaByIdentity.get(identityKey(seedMedia.Provider, seedMedia.ExternalId));
        if (
          (mediaById !== undefined && (mediaById.provider !== seedMedia.Provider || mediaById.externalId !== seedMedia.ExternalId)) ||
          (mediaByIdentity !== undefined && mediaByIdentity.id !== seedMedia.Id)
        ) {
          throw invalidOperation(
            `Stable media identity conflict for '${seedMedia.Provider}/${seedMedia.ExternalId}' (${seedMedia.Id}).`,
          );
        }

        if (mediaById === undefined && mediaByIdentity === undefined) {
          const media = MediaAsset.registerExternalReference(
            seedMedia.Id,
            deref(seedMedia.ContentType),
            deref(seedMedia.AltText),
            deref(seedMedia.Creator),
            deref(seedMedia.LicenseCode),
            deref(seedMedia.LicenseUrl),
            deref(seedMedia.Provider),
            deref(seedMedia.ExternalId),
            deref(seedMedia.SourceUrl),
            seedMedia.Width,
            seedMedia.Height,
            enumName(MEDIA_RIGHTS_STATUS, parseEnum(MEDIA_RIGHTS_STATUS, deref(seedMedia.RightsStatus))) as MediaRightsStatus,
            seedMedia.CreatedAt,
          );
          unit.trackMediaAsset(media);
          const identity = { id: media.id, provider: media.provider, externalId: media.externalId };
          existingMediaById.set(media.id, identity);
          existingMediaByIdentity.set(identityKey(media.provider, media.externalId), identity);
          mediaAssetsAdded++;
        } else {
          mediaAssetsSkipped++;
        }

        if (!recipe.mediaAssociations.some((association) => association.mediaAssetId === seedMedia.Id)) {
          recipe.addMedia(seedMedia.Id, seedMedia.Position, seedMedia.IsPrimary);
          mediaAssociationsAdded++;
        }
      }
    };

    for (const maybeRecipe of deref(seed.Recipes)) {
      const seedRecipe = deref(maybeRecipe);
      const recipeById = existingRecipesById.get(seedRecipe.Id);
      const recipeBySlug = seedRecipe.Slug === null ? undefined : existingRecipesBySlug.get(seedRecipe.Slug);
      if ((recipeById !== undefined && recipeById.slug !== seedRecipe.Slug) || (recipeBySlug !== undefined && recipeBySlug.id !== seedRecipe.Id)) {
        throw invalidOperation(`Stable recipe identity conflict for '${seedRecipe.Slug}' (${seedRecipe.Id}).`);
      }

      let placeId: string | undefined;
      let relationType: RecipePlaceRelationType | undefined;
      if (seedRecipe.PlaceSlug !== null) {
        const resolved = existingPlacesBySlug.get(seedRecipe.PlaceSlug);
        if (resolved === undefined) {
          throw invalidData(`Recipe '${seedRecipe.Slug}' references unknown place '${seedRecipe.PlaceSlug}'.`);
        }
        placeId = resolved;
        relationType = (
          seedRecipe.PlaceRelationType === null
            ? "DiscoveryAnchor"
            : enumName(RECIPE_PLACE_RELATION_TYPE, parseEnum(RECIPE_PLACE_RELATION_TYPE, seedRecipe.PlaceRelationType))
        ) as RecipePlaceRelationType;
      }

      const existing = recipeById ?? recipeBySlug;
      if (existing !== undefined) {
        if (
          placeId !== undefined &&
          relationType !== undefined &&
          !existing.placeAssociations.some((association) => association.placeId === placeId && association.relationType === relationType)
        ) {
          existing.addPlace(placeId, relationType, true);
          associationsAdded++;
        }
        importMedia(seedRecipe, existing);
        recipesSkipped++;
        continue;
      }

      const recipe = Recipe.create(deref(seedRecipe.Slug), seedRecipe.CreatedAt, seedRecipe.Id);
      const version = recipe.addVersion(
        deref(seedRecipe.OriginalLocale),
        seedRecipe.Servings,
        seedRecipe.PreparationMinutes,
        seedRecipe.CookingMinutes,
        seedRecipe.CreatedAt,
      );
      version.addTranslation(deref(seedRecipe.OriginalLocale), deref(seedRecipe.Title), deref(seedRecipe.Summary), seedRecipe.CulturalNote);
      for (const maybeIngredient of deref(seedRecipe.Ingredients)) {
        const ingredient = deref(maybeIngredient);
        version.addIngredient(deref(ingredient.Name), ingredient.Quantity, ingredient.Unit, ingredient.PreparationNote);
      }
      for (const maybeStep of deref(seedRecipe.Steps)) {
        const step = deref(maybeStep);
        version.addStep(deref(step.Instruction), step.Title, step.DurationMinutes);
      }
      for (const maybeSource of deref(seedRecipe.Sources)) {
        const source = deref(maybeSource);
        version.addSource(deref(source.SourceUrl), deref(source.SourceName), deref(source.LicenseCode), source.RetrievedAt, source.ExternalId);
      }
      if (placeId !== undefined && relationType !== undefined) {
        recipe.addPlace(placeId, relationType, true);
        associationsAdded++;
      }
      importMedia(seedRecipe, recipe);
      unit.trackRecipe(recipe);
      existingRecipesById.set(recipe.id, recipe);
      existingRecipesBySlug.set(recipe.slug, recipe);
      recipesAdded++;

      // The importer compares the seed text, not the parsed enum ("2" validates as Published but stays Draft).
      if (seedRecipe.Status === "Published") {
        recipesToPublish.push({ recipe, publishedAt: deref(seedRecipe.PublishedAt) });
      }
    }

    await unit.saveChanges();

    for (const { recipe, publishedAt } of recipesToPublish) {
      if (recipe.versions.length !== 1) throw invalidOperation("Sequence contains more than one element");
      recipe.publish(recipe.versions[0]!.id, publishedAt);
    }

    await unit.saveChanges();

    return {
      recipesAdded,
      recipesSkipped,
      placesAdded,
      placesSkipped,
      associationsAdded,
      mediaAssetsAdded,
      mediaAssetsSkipped,
      mediaAssociationsAdded,
    };
  });
}

/** dbContext.Recipes.Include(PlaceAssociations).Include(MediaAssociations): tracked, without versions. */
async function loadRecipesWithAssociations(session: ToolSession): Promise<Recipe[]> {
  const db = session.db;
  const rows = await db.select().from(recipes);
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const placeRows = await db.select().from(recipePlaceAssociations).where(inArray(recipePlaceAssociations.recipeId, ids));
  const mediaRows = await db.select().from(recipeMediaAssociations).where(inArray(recipeMediaAssociations.recipeId, ids));
  const loaded = rows.map(
    (row) =>
      new Recipe(
        row.id,
        row.slug,
        row.status as PublicationStatus,
        row.currentVersionId,
        fromPostgresTimestamptz(row.createdAt),
        fromPostgresTimestamptz(row.updatedAt),
        row.publishedAt === null ? null : fromPostgresTimestamptz(row.publishedAt),
      ),
  );
  const byId = new Map(loaded.map((recipe) => [recipe.id, recipe]));
  for (const row of placeRows) {
    byId.get(row.recipeId)!.placeAssociations.push(
      new RecipePlaceAssociation(row.recipeId, row.placeId, row.relationType as RecipePlaceRelationType, row.isPrimary),
    );
  }
  for (const row of mediaRows) {
    byId.get(row.recipeId)!.mediaAssociations.push(new RecipeMediaAssociation(row.recipeId, row.mediaAssetId, row.position, row.isPrimary));
  }
  return loaded;
}

