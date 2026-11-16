// Port of Savora.Infrastructure.GeneratedMedia.GeneratedMediaImporter: after the matching
// immutable review has been imported, registers each visually accepted replacement asset
// (generated local PNG or external image), verifies its rights and makes it the recipe's primary media.
import { eq, inArray } from "drizzle-orm";
import { compareCultureStrings } from "../../../domain/catalog";
import { deref, invalidData, invalidOperation, throwIfNullOrWhiteSpace } from "../../../domain/dotnet/errors";
import { createVersion7 } from "../../../domain/dotnet/guid";
import { httpsUriFacts } from "../../../domain/dotnet/uri";
import { MediaAsset } from "../../../domain/model/media";
import { singleOrDefault } from "../../../domain/model/recipe";
import { isNullOrWhiteSpace } from "../../../domain/text";
import { mediaAssets, mediaReviewImports, recipes } from "../../db/schema";
import type { MediaCandidateManifestAsset, LoadedMediaReviewPackage } from "../media-reviews/media-review-package";
import { includeMediaAssociations, toMediaAsset, toRecipe } from "../recipe-aggregates";
import type { ToolSession } from "../tool-database";
import { UnitOfWork } from "../unit-of-work";
import { validateGeneratedImage } from "./generated-image-file-validator";

export interface GeneratedMediaImportResult {
  assetsAdded: number;
  assetsAlreadyPresent: number;
  primaryAssociationsChanged: number;
}

interface PreparedReviewedAsset {
  recipeSlug: string;
  asset: MediaCandidateManifestAsset;
  storageKey: string | null;
}

function isSafeHttpsUrl(value: string | null): boolean {
  const uri = httpsUriFacts(value);
  return uri.https && uri.userInfo.length === 0;
}

async function prepareAsset(recipeSlug: string, asset: MediaCandidateManifestAsset, publicRoot: string): Promise<PreparedReviewedAsset> {
  if (asset.SourceType === "External") {
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(asset.ContentType ?? "") ||
      asset.LandingPageUrl === null ||
      !isSafeHttpsUrl(asset.LandingPageUrl) ||
      !isSafeHttpsUrl(asset.OriginalUrl) ||
      asset.Sha256 !== null ||
      asset.GeneratedAt !== null
    ) {
      throw invalidData(`Unsafe external asset metadata for '${recipeSlug}'.`);
    }
    return { recipeSlug, asset, storageKey: null };
  }
  if (
    asset.ContentType !== "image/png" ||
    asset.Sha256 === null ||
    asset.GeneratedAt === null ||
    !deref(asset.OriginalUrl).startsWith("/images/generated/") ||
    !asset.OriginalUrl!.endsWith("-v1.png") ||
    asset.OriginalUrl!.includes("..") ||
    asset.OriginalUrl!.includes("\\")
  ) {
    throw invalidData(`Unsafe generated asset metadata for '${recipeSlug}'.`);
  }
  const storageKey = asset.OriginalUrl!.replace(/^\/+/, "");
  await validateGeneratedImage(publicRoot, storageKey, asset.Sha256, asset.Width, asset.Height);
  return { recipeSlug, asset, storageKey };
}

export async function importGeneratedMedia(session: ToolSession, loaded: LoadedMediaReviewPackage, publicRoot: string): Promise<GeneratedMediaImportResult> {
  throwIfNullOrWhiteSpace(publicRoot, "publicRoot", isNullOrWhiteSpace);
  if ((await session.pendingMigrations()).length > 0) {
    throw invalidOperation("Apply reviewed database migrations before importing generated media.");
  }
  const db = session.db;
  const reviewExists = await db
    .select({ id: mediaReviewImports.id })
    .from(mediaReviewImports)
    .where(eq(mediaReviewImports.payloadSha256, loaded.PayloadSha256))
    .limit(1);
  if (reviewExists.length === 0) {
    throw invalidOperation("Import the matching immutable media review before replacing recipe media.");
  }

  const decisions = new Map(deref(loaded.Review.Decisions).map((item) => [deref(item).RecipeSlug!, deref(item)]));
  const prepared: PreparedReviewedAsset[] = [];
  for (const maybeRecord of deref(loaded.Manifest.Records)) {
    const record = deref(maybeRecord);
    const decision = decisions.get(record.RecipeSlug!);
    const asset = record.Asset;
    if (
      decision === undefined ||
      decision.Decision !== "VisuallyAccepted" ||
      asset === null ||
      asset.RightsStatus !== "Pending" ||
      (asset.SourceType !== "Generated" && asset.SourceType !== "External")
    ) {
      throw invalidData("Every replacement must be generated or external, rights-pending, and visually accepted.");
    }
    prepared.push(await prepareAsset(record.RecipeSlug!, asset, publicRoot));
  }

  const slugs = prepared.map((item) => item.recipeSlug);
  const recipeRows = slugs.length === 0 ? [] : await db.select().from(recipes).where(inArray(recipes.slug, slugs));
  const loadedRecipes = recipeRows.map(toRecipe);
  await includeMediaAssociations(session, loadedRecipes, false);
  const recipesBySlug = new Map(loadedRecipes.map((recipe) => [recipe.slug, recipe]));
  const missing = slugs.filter((slug) => !recipesBySlug.has(slug)).sort(compareCultureStrings);
  if (missing.length > 0) throw invalidOperation(`Database recipes are missing: ${missing.join(", ")}`);

  const identities = prepared.map((item) => item.asset.ProviderId!);
  const existingAssets = (identities.length === 0 ? [] : await db.select().from(mediaAssets).where(inArray(mediaAssets.externalId, identities))).map(
    toMediaAsset,
  );
  const identityKey = (provider: string | null, externalId: string | null) => `${provider}\u0000${externalId}`;
  const existingByIdentity = new Map(existingAssets.map((asset) => [identityKey(asset.provider, asset.externalId), asset]));

  const unit = new UnitOfWork(session);
  loadedRecipes.forEach((recipe) => unit.trackRecipe(recipe));
  existingAssets.forEach((asset) => unit.trackMediaAsset(asset));
  let assetsAdded = 0;
  let primaryAssociationsChanged = 0;

  return session.transaction(async () => {
    for (const item of prepared) {
      const key = identityKey(item.asset.Provider, item.asset.ProviderId);
      let mediaAsset = existingByIdentity.get(key);
      if (mediaAsset === undefined) {
        mediaAsset =
          item.storageKey !== null
            ? MediaAsset.register(
                item.storageKey,
                deref(item.asset.ContentType),
                deref(item.asset.AltTextDraft),
                deref(item.asset.Creator),
                deref(item.asset.LicenseCode),
                deref(item.asset.LicenseUrl),
                deref(item.asset.Provider),
                deref(item.asset.ProviderId),
                null,
                item.asset.Width,
                item.asset.Height,
                "Pending",
                deref(item.asset.GeneratedAt),
              )
            : MediaAsset.registerExternalReference(
                createVersion7(),
                deref(item.asset.ContentType),
                deref(item.asset.AltTextDraft),
                deref(item.asset.Creator),
                deref(item.asset.LicenseCode),
                deref(item.asset.LicenseUrl),
                deref(item.asset.Provider),
                deref(item.asset.ProviderId),
                deref(item.asset.OriginalUrl),
                item.asset.Width,
                item.asset.Height,
                "Pending",
                loaded.Review.ExportedAt,
              );
        unit.trackMediaAsset(mediaAsset);
        existingByIdentity.set(key, mediaAsset);
        assetsAdded++;
      } else if (
        mediaAsset.storageKey !== item.storageKey ||
        mediaAsset.contentType !== item.asset.ContentType ||
        mediaAsset.width !== item.asset.Width ||
        mediaAsset.height !== item.asset.Height ||
        (item.storageKey === null && mediaAsset.sourceUrl !== newUriAbsolute(item.asset.OriginalUrl)) ||
        mediaAsset.rightsStatus === "Rejected"
      ) {
        throw invalidOperation(`Existing media identity conflicts with '${item.asset.ProviderId}'.`);
      }

      mediaAsset.verifyRights();
      const recipe = recipesBySlug.get(item.recipeSlug)!;
      const previousPrimaryId = singleOrDefault(recipe.mediaAssociations, (link) => link.isPrimary)?.mediaAssetId;
      recipe.replacePrimaryMedia(mediaAsset.id);
      if (previousPrimaryId !== mediaAsset.id) primaryAssociationsChanged++;
    }
    await unit.saveChanges();
    return { assetsAdded, assetsAlreadyPresent: prepared.length - assetsAdded, primaryAssociationsChanged };
  });
}

/** new Uri(value).AbsoluteUri for a value already validated as a safe https URL. */
function newUriAbsolute(value: string | null): string | null {
  const uri = httpsUriFacts(value);
  return uri.https ? uri.absoluteUri : null;
}
