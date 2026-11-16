// Port of Savora.Infrastructure.Publishing.RecipePublicationPackage(Loader).
import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { DotnetDecimal } from "../../../domain/dotnet/decimal";
import { DotnetException, deref, invalidData, throwIfNullOrWhiteSpace } from "../../../domain/dotnet/errors";
import { type Instant, compareInstants, isDefaultInstant } from "../../../domain/dotnet/instant";
import { type HttpsUriFacts, httpsUriFacts } from "../../../domain/dotnet/uri";
import { isNullOrWhiteSpace, requireSlug } from "../../../domain/text";
import { bool, deserialize, dto, int, list, nullableDecimal, nullableInt, record, string } from "../../dotnet/stj";
import { getFullPath, readAllBytes } from "../file-io";
import { matchesHowToCookPhotoPolicy } from './howtocook-photo-policy';
import {
  validateGeneratedImage,
  validateLicensedLocalImage,
  validateOwnerApprovedLocalImage,
} from "../media/generated-image-file-validator";

const NS = "Savora.Infrastructure.Publishing";
const MAX_PACKAGE_BYTES = 256 * 1024;

const checksSchema = record(`${NS}.PublicationReviewChecks`, [
  ["RecipeContent", bool],
  ["SourceAttribution", bool],
  ["CulturalClaims", bool],
  ["MediaRights", bool],
  ["VisualQuality", bool],
]);
const translationSchema = record(`${NS}.PublicationTranslation`, [
  ["Locale", string],
  ["Title", string],
  ["Summary", string],
  ["CulturalNote", string],
  ["IsMachineTranslated", bool],
]);
const ingredientSchema = record(`${NS}.PublicationIngredient`, [
  ["Name", string],
  ["Quantity", nullableDecimal],
  ["Unit", string],
  ["PreparationNote", string],
]);
const stepSchema = record(`${NS}.PublicationStep`, [
  ["Instruction", string],
  ["Title", string],
  ["DurationMinutes", nullableInt],
]);
const sourceSchema = record(`${NS}.PublicationSource`, [
  ["SourceUrl", string],
  ["SourceName", string],
  ["LicenseCode", string],
  ["RetrievedAt", dto],
  ["ExternalId", string],
]);
const versionSchema = record(`${NS}.PublicationRecipeVersion`, [
  ["OriginalLocale", string],
  ["Servings", int],
  ["PreparationMinutes", nullableInt],
  ["CookingMinutes", nullableInt],
  ["Translation", translationSchema],
  ["Ingredients", list(ingredientSchema)],
  ["Steps", list(stepSchema)],
  ["Sources", list(sourceSchema)],
]);
const mediaSchema = record(`${NS}.PublicationMediaAsset`, [
  ["Provider", string],
  ["ExternalId", string],
  ["LandingPageUrl", string],
  ["SourceUrl", string],
  ["ContentType", string],
  ["AltText", string],
  ["Creator", string],
  ["LicenseCode", string],
  ["LicenseUrl", string],
  ["Width", int],
  ["Height", int],
  ["RightsStatus", string],
  ["SourceType", string, "External"],
  ["StorageKey", string],
  ["Sha256", string],
]);
export const recipePublicationPackageSchema = record(`${NS}.RecipePublicationPackageFile`, [
  ["SchemaVersion", int],
  ["Decision", string],
  ["RecipeSlug", string],
  ["ExpectedStatus", string],
  ["BasedOnVersion", int],
  ["ExpectedUpdatedAt", dto],
  ["ApprovedAt", dto],
  ["ReviewedBy", string],
  ["ReviewNote", string],
  ["Checks", checksSchema],
  ["MediaPolicy", string],
  ["Version", versionSchema],
  ["PrimaryMedia", mediaSchema],
]);

export interface PublicationTranslation { Locale: string | null; Title: string | null; Summary: string | null; CulturalNote: string | null; IsMachineTranslated: boolean }
export interface PublicationIngredient { Name: string | null; Quantity: DotnetDecimal | null; Unit: string | null; PreparationNote: string | null }
export interface PublicationStep { Instruction: string | null; Title: string | null; DurationMinutes: number | null }
export interface PublicationSource { SourceUrl: string | null; SourceName: string | null; LicenseCode: string | null; RetrievedAt: Instant; ExternalId: string | null }
export interface PublicationRecipeVersion {
  OriginalLocale: string | null; Servings: number; PreparationMinutes: number | null; CookingMinutes: number | null;
  Translation: PublicationTranslation | null; Ingredients: Array<PublicationIngredient | null> | null;
  Steps: Array<PublicationStep | null> | null; Sources: Array<PublicationSource | null> | null;
}
export interface PublicationMediaAsset {
  Provider: string | null; ExternalId: string | null; LandingPageUrl: string | null; SourceUrl: string | null; ContentType: string | null;
  AltText: string | null; Creator: string | null; LicenseCode: string | null; LicenseUrl: string | null; Width: number; Height: number;
  RightsStatus: string | null; SourceType: string | null; StorageKey: string | null; Sha256: string | null;
}
export interface RecipePublicationPackageFile {
  SchemaVersion: number; Decision: string | null; RecipeSlug: string | null; ExpectedStatus: string | null; BasedOnVersion: number;
  ExpectedUpdatedAt: Instant; ApprovedAt: Instant; ReviewedBy: string | null; ReviewNote: string | null;
  Checks: { RecipeContent: boolean; SourceAttribution: boolean; CulturalClaims: boolean; MediaRights: boolean; VisualQuality: boolean } | null;
  MediaPolicy: string | null; Version: PublicationRecipeVersion | null; PrimaryMedia: PublicationMediaAsset | null;
}
export interface LoadedRecipePublicationPackage {
  Payload: RecipePublicationPackageFile;
  PayloadSha256: string;
}

const PUBLICATION_OPTIONS = { caseInsensitive: true };

export async function loadRecipePublicationPackage(packagePath: string, publicRoot: string | null): Promise<LoadedRecipePublicationPackage> {
  throwIfNullOrWhiteSpace(packagePath, "packagePath", isNullOrWhiteSpace);
  const fullPath = getFullPath(packagePath);
  let size = -1;
  try {
    const info = await stat(fullPath);
    if (info.isFile()) size = info.size;
  } catch {
    size = -1;
  }
  if (size < 2 || size > MAX_PACKAGE_BYTES) {
    throw invalidData("Publication package is missing, empty, or exceeds 256 KiB.");
  }
  const bytes = await readAllBytes(fullPath);
  let payload: RecipePublicationPackageFile | null;
  try {
    payload = deserialize(bytes, recipePublicationPackageSchema, PUBLICATION_OPTIONS) as unknown as RecipePublicationPackageFile | null;
  } catch (error) {
    if (error instanceof DotnetException && error.dotnetType === "System.Text.Json.JsonException") {
      throw invalidData("Publication package JSON is invalid or contains unknown fields.", error);
    }
    throw error;
  }
  if (payload === null) throw invalidData("Publication package is empty.");
  await validate(payload, publicRoot);
  return { Payload: payload, PayloadSha256: createHash("sha256").update(bytes).digest("hex") };
}

async function validate(pkg: RecipePublicationPackageFile, publicRoot: string | null): Promise<void> {
  if (
    ![1, 2, 3, 4, 5, 6].includes(pkg.SchemaVersion) ||
    pkg.Decision !== "Publish" ||
    pkg.ExpectedStatus !== "Draft" ||
    pkg.BasedOnVersion < 1 ||
    isDefaultInstant(pkg.ExpectedUpdatedAt) ||
    compareInstants(pkg.ApprovedAt, pkg.ExpectedUpdatedAt) < 0 ||
    pkg.MediaPolicy !== "VerifiedPrimaryRequired"
  ) {
    throw invalidData("Publication package header is invalid.");
  }
  requireSlug(pkg.RecipeSlug);
  const checks = pkg.Checks;
  if (!(checks !== null && checks.RecipeContent && checks.SourceAttribution && checks.CulturalClaims && checks.MediaRights && checks.VisualQuality)) {
    throw invalidData("Every editorial publication check must be explicitly accepted.");
  }
  const version = pkg.Version;
  if (version === null) throw invalidData("Reviewed recipe version is required.");
  const within = (items: unknown[] | null, max: number) => items !== null && items.length > 0 && items.length <= max;
  if (
    version.Translation === null ||
    version.Translation.IsMachineTranslated ||
    !within(version.Ingredients, 1000) ||
    !within(version.Steps, 200) ||
    !within(version.Sources, 20)
  ) {
    throw invalidData("Reviewed recipe content is incomplete or exceeds safe limits.");
  }
  if (version.Translation.Locale !== version.OriginalLocale) {
    throw invalidData("The reviewed translation must match the version's original locale.");
  }
  for (const maybeSource of version.Sources!) {
    const source = deref(maybeSource);
    requireSafeHttpsUrl(source.SourceUrl, "recipe source");
    if (isDefaultInstant(source.RetrievedAt)) throw invalidData("Every source requires a retrieval time.");
  }
  if (pkg.PrimaryMedia === null) throw invalidData("Verified primary media is required.");
  await validateMedia(pkg.SchemaVersion, pkg.RecipeSlug!, pkg.PrimaryMedia, publicRoot);
}

function knownCreativeCommonsLicense(code: string | null, licensePath: string): boolean {
  const allowed: Record<string, string> = {
    "CC-BY-2.0": "/licenses/by/2.0/",
    "CC-BY-SA-2.0": "/licenses/by-sa/2.0/",
    "CC-BY-SA-3.0": "/licenses/by-sa/3.0/",
    "CC-BY-3.0": "/licenses/by/3.0/",
    "CC-BY-4.0": "/licenses/by/4.0/",
    "CC-BY-SA-4.0": "/licenses/by-sa/4.0/",
    "CC0-1.0": "/publicdomain/zero/1.0/",
    "PUBLIC-DOMAIN": "/publicdomain/mark/1.0/",
  };
  return code !== null && Object.hasOwn(allowed, code) && allowed[code] === licensePath;
}

function requireSafeHttpsUrl(value: string | null, label: string): HttpsUriFacts {
  const uri = httpsUriFacts(value);
  if (!uri.https || uri.userInfo.length > 0 || uri.fragment.length > 0) {
    throw invalidData(`The ${label} must be an absolute HTTPS URL without credentials or fragments.`);
  }
  return uri;
}

/** Path.GetFileName on Windows: the text after the last '/' or '\\'. */
function getFileName(value: string): string {
  return value.slice(Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\")) + 1);
}

async function validateMedia(schemaVersion: number, recipeSlug: string, media: PublicationMediaAsset, publicRoot: string | null): Promise<void> {
  if (
    media.RightsStatus !== "Verified" ||
    !["image/jpeg", "image/png", "image/webp"].includes(media.ContentType ?? "") ||
    media.Width < 1 || media.Width > 32768 ||
    media.Height < 1 || media.Height > 32768
  ) {
    throw invalidData("Primary media metadata is not approved for publication.");
  }
  const license = requireSafeHttpsUrl(media.LicenseUrl, "media license");

  if (media.SourceType === "Generated") {
    if (
      schemaVersion !== 2 ||
      media.Provider !== "ChatGPT Work image generation" ||
      !deref(media.ExternalId).startsWith("exec-") ||
      media.ContentType !== "image/png" ||
      media.Creator !== "Savora editorial with ChatGPT Work" ||
      media.LicenseCode !== "OPENAI-OUTPUT" ||
      license.host !== "openai.com" ||
      license.absolutePath !== "/policies/row-terms-of-use/" ||
      media.LandingPageUrl !== null ||
      media.SourceUrl !== null ||
      media.StorageKey === null ||
      !getFileName(media.StorageKey).startsWith(recipeSlug) ||
      media.Sha256 === null ||
      publicRoot === null
    ) {
      throw invalidData("Generated primary media evidence is incomplete or outside the reviewed policy.");
    }
    await validateGeneratedImage(publicRoot, media.StorageKey, media.Sha256, media.Width, media.Height);
    return;
  }

  if (media.SourceType === "LicensedLocal") {
    if(schemaVersion===5&&media.Provider==='HowToCook repository'){
      if(publicRoot===null||!matchesHowToCookPhotoPolicy(media,recipeSlug))
        throw invalidData('HowToCook photo is outside the pinned, individually reviewed repository policy.');
      await validateLicensedLocalImage(publicRoot,media.StorageKey,media.Sha256,media.Width,media.Height,media.ContentType);
      return;
    }
    // Owner instruction (2026-10-13): when Wikimedia Commons is rate-limited or has no match, other open
    // channels may be used. Flickr photographs are accepted only with a Creative Commons licence that the
    // Openverse index reports for that exact photo, with creator, licence URL and Flickr page recorded.
    if (schemaVersion === 6 && media.Provider === "Flickr") {
      const landing = requireSafeHttpsUrl(media.LandingPageUrl, "Flickr photo page");
      const source = requireSafeHttpsUrl(media.SourceUrl, "Flickr photo file");
      if (
        media.ContentType !== "image/jpeg" ||
        media.StorageKey !== `images/dishes/${recipeSlug}.jpg` ||
        media.Sha256 === null || publicRoot === null ||
        isNullOrWhiteSpace(media.Creator) || media.Creator!.length > 300 || isNullOrWhiteSpace(media.ExternalId) ||
        (landing.host !== "www.flickr.com" && landing.host !== "flickr.com") ||
        !/^\/photos\/[A-Za-z0-9@_.-]+\/\d+\/?$/.test(landing.absolutePath) ||
        !/^(?:live|farm\d+|c\d+)\.staticflickr\.com$/.test(source.host) ||
        license.host !== "creativecommons.org" ||
        !knownCreativeCommonsLicense(media.LicenseCode, license.absolutePath)
      ) {
        throw invalidData("Flickr photo evidence is outside the reviewed open-license policy.");
      }
      await validateLicensedLocalImage(publicRoot, media.StorageKey, media.Sha256, media.Width, media.Height, media.ContentType);
      return;
    }
    // MAFF explicitly permits reuse of downloadable photos, with source/provider
    // credits. This is NOT permission for every photograph on the MAFF domain.
    // https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/index.html
    // ZIP-offer/page-level evidence remains mandatory in the offline editorial package.
    if (schemaVersion === 5) {
      const landing = requireSafeHttpsUrl(media.LandingPageUrl, "MAFF photo page");
      const source = requireSafeHttpsUrl(media.SourceUrl, "MAFF photo download");
      if (
        media.Provider !== "MAFF Our Regional Cuisines" ||
        media.ContentType !== "image/jpeg" ||
        media.StorageKey !== `images/dishes/${recipeSlug}.jpg` ||
        media.Sha256 === null || publicRoot === null ||
        isNullOrWhiteSpace(media.Creator) || isNullOrWhiteSpace(media.ExternalId) ||
        media.LicenseCode !== "MAFF-DOWNLOAD-PERMISSION" ||
        media.LicenseUrl !== "https://www.maff.go.jp/j/keikaku/syokubunka/k_ryouri/search_menu/index.html" ||
        landing.host !== "www.maff.go.jp" || landing.query !== "" ||
        !/^\/j\/keikaku\/syokubunka\/k_ryouri\/search_menu\/menu\/[a-z0-9_]+\.html$/.test(landing.absolutePath) ||
        source.host !== "www.maff.go.jp" || source.query !== "" ||
        !/^\/j\/keikaku\/syokubunka\/k_ryouri\/img\/[A-Za-z0-9_-]+\.zip$/.test(source.absolutePath) ||
        media.ExternalId !== getFileName(source.absolutePath)
      ) {
        throw invalidData("MAFF local photo evidence is outside the reviewed downloadable-photo policy.");
      }
      await validateLicensedLocalImage(publicRoot, media.StorageKey, media.Sha256, media.Width, media.Height, media.ContentType);
      return;
    }
    if (
      schemaVersion !== 3 ||
      media.Provider !== "Wikimedia Commons" ||
      media.ContentType !== "image/jpeg" ||
      // Keep existing assets immutable; this reviewed batch has one exact revision path.
      (media.StorageKey !== `images/dishes/${recipeSlug}.jpg` &&
        media.StorageKey !== `images/dishes/${recipeSlug}-photo-20261005-v2.jpg`) ||
      media.Sha256 === null ||
      publicRoot === null
    ) {
      throw invalidData("Licensed local primary media evidence is incomplete or outside the reviewed policy.");
    }
    const localLanding = requireSafeHttpsUrl(media.LandingPageUrl, "media landing page");
    const localSource = requireSafeHttpsUrl(media.SourceUrl, "media source");
    if (
      localLanding.host !== "commons.wikimedia.org" ||
      !localLanding.absolutePath.startsWith("/wiki/File:") ||
      localSource.host !== "upload.wikimedia.org" ||
      license.host !== "creativecommons.org" ||
      !knownCreativeCommonsLicense(media.LicenseCode, license.absolutePath)
    ) {
      throw invalidData("Licensed local primary media source or license is outside the reviewed allowlist.");
    }
    await validateLicensedLocalImage(publicRoot, media.StorageKey, media.Sha256, media.Width, media.Height, media.ContentType);
    return;
  }

  if (media.SourceType === "OwnerApprovedLocal") {
    if (
      schemaVersion !== 4 ||
      media.Provider !== "ChatGPT Work image generation" ||
      !deref(media.ExternalId).startsWith("legacy-output-unavailable:") ||
      media.ContentType !== "image/png" ||
      media.StorageKey !== `images/dishes/${recipeSlug}.png` ||
      media.Sha256 === null ||
      media.Creator !== "Savora editorial with ChatGPT Work" ||
      media.LicenseCode !== "OPENAI-OUTPUT-OWNER-APPROVED" ||
      license.host !== "openai.com" ||
      license.absolutePath !== "/policies/row-terms-of-use/" ||
      media.LandingPageUrl !== null ||
      media.SourceUrl !== null ||
      publicRoot === null
    ) {
      throw invalidData("Owner-approved local primary media evidence is incomplete or outside the reviewed policy.");
    }
    await validateOwnerApprovedLocalImage(publicRoot, media.StorageKey, media.Sha256, media.Width, media.Height, media.ContentType);
    return;
  }

  if (media.SourceType === "OwnerApprovedExternal") {
    const approvedSource = requireSafeHttpsUrl(media.SourceUrl, "media source");
    if (
      schemaVersion !== 4 ||
      media.Provider !== "Unsplash" ||
      !deref(media.ExternalId).startsWith("photo-") ||
      media.ContentType !== "image/jpeg" ||
      media.Creator !== "Unsplash contributor (legacy Savora asset)" ||
      media.LicenseCode !== "UNSPLASH-LICENSE-OWNER-APPROVED" ||
      license.host !== "unsplash.com" ||
      license.absolutePath !== "/license" ||
      media.LandingPageUrl !== null ||
      approvedSource.host !== "images.unsplash.com" ||
      approvedSource.absolutePath !== `/${media.ExternalId}` ||
      approvedSource.query !== "?auto=format&fit=crop&q=88&w=1200" ||
      media.StorageKey !== null ||
      media.Sha256 !== null
    ) {
      throw invalidData("Owner-approved external primary media evidence is incomplete or outside the reviewed policy.");
    }
    return;
  }

  if (media.SourceType !== "External" || media.Provider !== "Wikimedia Commons" || media.StorageKey !== null || media.Sha256 !== null) {
    throw invalidData("External primary media metadata is outside the reviewed policy.");
  }
  const landing = requireSafeHttpsUrl(media.LandingPageUrl, "media landing page");
  const source = requireSafeHttpsUrl(media.SourceUrl, "media source");
  if (
    landing.host !== "commons.wikimedia.org" ||
    !landing.absolutePath.startsWith("/wiki/File:") ||
    source.host !== "upload.wikimedia.org" ||
    license.host !== "creativecommons.org" ||
    !knownCreativeCommonsLicense(media.LicenseCode, license.absolutePath)
  ) {
    throw invalidData("Primary media source or license is outside the reviewed allowlist.");
  }
}

export { path };
