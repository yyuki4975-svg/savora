// Port of Savora.Infrastructure.Publishing.RecipePublisher: publishes one reviewed Draft as a new
// immutable version with a Verified primary image and an audit row, atomically (Serializable).
// Re-running the same package is a no-op that returns the recorded audit.
import { eq } from "drizzle-orm";
import { deref, invalidOperation } from "../../../domain/dotnet/errors";
import { createVersion7 } from "../../../domain/dotnet/guid";
import { instantsEqual, utcNow } from "../../../domain/dotnet/instant";
import { httpsUriFacts } from "../../../domain/dotnet/uri";
import { RecipePublicationAudit } from "../../../domain/model/editorial";
import { MediaAsset } from "../../../domain/model/media";
import { recipePublicationAudits, recipeVersions } from "../../db/schema";
import { findMediaAsset, findRecipeBySlug, includeMediaAssociations, includeVersions } from "../recipe-aggregates";
import type { ToolSession } from "../tool-database";
import { UnitOfWork } from "../unit-of-work";
import type { LoadedRecipePublicationPackage } from "./recipe-publication-package";

export interface RecipePublicationResult {
  auditId: string;
  recipeId: string;
  versionNumber: number;
  added: boolean;
}

const isLocalMedia = (sourceType: string | null) => sourceType === "Generated" || sourceType === "LicensedLocal" || sourceType === "OwnerApprovedLocal";

/** new Uri(value).AbsoluteUri (the value was already validated as an absolute https URL). */
function absoluteUri(value: string | null): string {
  const uri = httpsUriFacts(value);
  if (!uri.https) throw invalidOperation("Invalid URI: The format of the URI could not be determined.");
  return uri.absoluteUri;
}

export async function publishRecipe(session: ToolSession, loaded: LoadedRecipePublicationPackage): Promise<RecipePublicationResult> {
  return session.transaction(async () => {
    const db = session.db;
    const existingAudits = await db
      .select()
      .from(recipePublicationAudits)
      .where(eq(recipePublicationAudits.payloadSha256, loaded.PayloadSha256))
      .limit(2);
    if (existingAudits.length > 1) throw invalidOperation("Sequence contains more than one element.");
    const existingAudit = existingAudits[0];
    if (existingAudit !== undefined) {
      const versions = await db.select().from(recipeVersions).where(eq(recipeVersions.id, existingAudit.recipeVersionId)).limit(2);
      if (versions.length !== 1) throw invalidOperation(versions.length === 0 ? "Sequence contains no elements." : "Sequence contains more than one element.");
      return { auditId: existingAudit.id, recipeId: existingAudit.recipeId, versionNumber: versions[0]!.versionNumber, added: false };
    }

    const request = loaded.Payload;
    const recipe = await findRecipeBySlug(session, request.RecipeSlug);
    if (recipe === undefined) throw invalidOperation("The reviewed recipe does not exist.");
    await includeVersions(session, [recipe]);
    const trackedAssets = await includeMediaAssociations(session, [recipe], true);
    const unit = new UnitOfWork(session);
    unit.trackRecipe(recipe);
    trackedAssets.forEach((asset) => unit.trackMediaAsset(asset));

    const latestVersion = [...recipe.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
    if (latestVersion === undefined) throw invalidOperation("The reviewed recipe has no base version.");
    if (
      recipe.status !== "Draft" ||
      recipe.currentVersionId !== null ||
      recipe.publishedAt !== null ||
      latestVersion.versionNumber !== request.BasedOnVersion ||
      !instantsEqual(recipe.updatedAt, request.ExpectedUpdatedAt)
    ) {
      throw invalidOperation("The recipe changed after editorial review or is no longer an unpublished Draft.");
    }

    const media = deref(request.PrimaryMedia);
    const found = await findMediaAsset(session, media.Provider, media.ExternalId);
    // EF returns the already-tracked instance when the asset was loaded with the recipe.
    let mediaAsset = found === undefined ? undefined : (trackedAssets.find((asset) => asset.id === found.id) ?? found);
    if (mediaAsset === undefined) {
      mediaAsset = isLocalMedia(media.SourceType)
        ? MediaAsset.register(
            deref(media.StorageKey),
            deref(media.ContentType),
            deref(media.AltText),
            deref(media.Creator),
            deref(media.LicenseCode),
            deref(media.LicenseUrl),
            deref(media.Provider),
            deref(media.ExternalId),
            media.SourceUrl,
            media.Width,
            media.Height,
            "Verified",
            request.ApprovedAt,
          )
        : MediaAsset.registerExternalReference(
            createVersion7(),
            deref(media.ContentType),
            deref(media.AltText),
            deref(media.Creator),
            deref(media.LicenseCode),
            deref(media.LicenseUrl),
            deref(media.Provider),
            deref(media.ExternalId),
            deref(media.SourceUrl),
            media.Width,
            media.Height,
            "Verified",
            request.ApprovedAt,
          );
      unit.trackMediaAsset(mediaAsset);
    } else if (
      mediaAsset.contentType !== media.ContentType ||
      mediaAsset.altText !== media.AltText ||
      mediaAsset.creator !== media.Creator ||
      mediaAsset.licenseCode !== media.LicenseCode ||
      mediaAsset.licenseUrl !== absoluteUri(media.LicenseUrl) ||
      mediaAsset.width !== media.Width ||
      mediaAsset.height !== media.Height ||
      (isLocalMedia(media.SourceType)
        ? mediaAsset.storageKey !== media.StorageKey || mediaAsset.sourceUrl !== (media.SourceUrl === null ? null : absoluteUri(media.SourceUrl))
        : mediaAsset.storageKey !== null || mediaAsset.sourceUrl !== absoluteUri(media.SourceUrl))
    ) {
      throw invalidOperation("Existing primary media conflicts with the reviewed rights evidence.");
    } else {
      unit.trackMediaAsset(mediaAsset);
      mediaAsset.verifyRights();
    }

    if (recipe.mediaAssociations.length === 0) {
      recipe.addMedia(mediaAsset.id, 1, true);
    } else if (
      recipe.mediaAssociations.length !== 1 ||
      recipe.mediaAssociations[0]!.mediaAssetId !== mediaAsset.id ||
      !recipe.mediaAssociations[0]!.isPrimary
    ) {
      throw invalidOperation("Draft media changed after editorial review.");
    }

    const reviewed = deref(request.Version);
    const version = recipe.addVersion(
      deref(reviewed.OriginalLocale),
      reviewed.Servings,
      reviewed.PreparationMinutes,
      reviewed.CookingMinutes,
      request.ApprovedAt,
    );
    const translation = deref(reviewed.Translation);
    version.addTranslation(deref(translation.Locale), deref(translation.Title), deref(translation.Summary), translation.CulturalNote, translation.IsMachineTranslated);
    for (const maybeIngredient of deref(reviewed.Ingredients)) {
      const ingredient = deref(maybeIngredient);
      version.addIngredient(deref(ingredient.Name), ingredient.Quantity, ingredient.Unit, ingredient.PreparationNote);
    }
    for (const maybeStep of deref(reviewed.Steps)) {
      const step = deref(maybeStep);
      version.addStep(deref(step.Instruction), step.Title, step.DurationMinutes);
    }
    for (const maybeSource of deref(reviewed.Sources)) {
      const source = deref(maybeSource);
      version.addSource(deref(source.SourceUrl), deref(source.SourceName), deref(source.LicenseCode), source.RetrievedAt, source.ExternalId);
    }

    await unit.saveChanges();
    recipe.publish(version.id, request.ApprovedAt);
    await unit.saveChanges();

    const audit = RecipePublicationAudit.create(
      recipe.id,
      version.id,
      request.BasedOnVersion,
      loaded.PayloadSha256,
      deref(request.ReviewedBy),
      deref(request.ReviewNote),
      deref(request.MediaPolicy),
      request.ApprovedAt,
      utcNow(),
    );
    unit.addAudit(audit);
    await unit.saveChanges();
    return { auditId: audit.id, recipeId: recipe.id, versionNumber: version.versionNumber, added: true };
  }, "Serializable");
}
