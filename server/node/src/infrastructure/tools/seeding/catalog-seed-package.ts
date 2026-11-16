// Port of Savora.Infrastructure.Seeding.CatalogSeedPackage(Loader).
import { createHash, timingSafeEqual } from "node:crypto";
import path from "node:path";
import type { DotnetDecimal } from "../../../domain/dotnet/decimal";
import { argumentNullException, deref, invalidData, throwIfNullOrWhiteSpace } from "../../../domain/dotnet/errors";
import {
  MEDIA_RIGHTS_STATUS,
  PLACE_TYPE,
  PUBLICATION_STATUS,
  RECIPE_PLACE_RELATION_TYPE,
  enumName,
  isDefinedEnum,
  tryParseEnum,
} from "../../../domain/dotnet/enum";
import { EMPTY_GUID } from "../../../domain/dotnet/guid";
import type { Instant } from "../../../domain/dotnet/instant";
import { httpsUriFacts } from "../../../domain/dotnet/uri";
import { isNullOrWhiteSpace } from "../../../domain/text";
import {
  bool,
  deserialize,
  dto,
  guid,
  int,
  list,
  nullableDecimal,
  nullableDouble,
  nullableDto,
  nullableInt,
  record,
  string,
} from "../../dotnet/stj";
import { getFullPath, readAllBytes } from "../file-io";

const NS = "Savora.Infrastructure.Seeding";

const ingredientSchema = record(`${NS}.CatalogSeedIngredient`, [
  ["Name", string],
  ["Quantity", nullableDecimal],
  ["Unit", string],
  ["PreparationNote", string],
]);
const stepSchema = record(`${NS}.CatalogSeedStep`, [
  ["Title", string],
  ["Instruction", string],
  ["DurationMinutes", nullableInt],
]);
const sourceSchema = record(`${NS}.CatalogSeedSource`, [
  ["SourceUrl", string],
  ["SourceName", string],
  ["LicenseCode", string],
  ["RetrievedAt", dto],
  ["ExternalId", string],
]);
const mediaSchema = record(`${NS}.CatalogSeedMedia`, [
  ["Id", guid],
  ["Provider", string],
  ["ExternalId", string],
  ["SourceUrl", string],
  ["ContentType", string],
  ["AltText", string],
  ["Creator", string],
  ["LicenseCode", string],
  ["LicenseUrl", string],
  ["RightsStatus", string],
  ["Position", int],
  ["IsPrimary", bool],
  ["CreatedAt", dto],
  ["Width", nullableInt],
  ["Height", nullableInt],
]);
const recipeSchema = record(`${NS}.CatalogSeedRecipe`, [
  ["Id", guid],
  ["Slug", string],
  ["Status", string],
  ["OriginalLocale", string],
  ["Title", string],
  ["Summary", string],
  ["CulturalNote", string],
  ["Servings", int],
  ["PreparationMinutes", nullableInt],
  ["CookingMinutes", nullableInt],
  ["CreatedAt", dto],
  ["PublishedAt", nullableDto],
  ["PlaceSlug", string],
  ["PlaceRelationType", string],
  ["Ingredients", list(ingredientSchema)],
  ["Steps", list(stepSchema)],
  ["Sources", list(sourceSchema)],
  ["Media", list(mediaSchema)],
]);
const placeNameSchema = record(`${NS}.CatalogSeedPlaceName`, [
  ["Locale", string],
  ["Name", string],
]);
const placeSchema = record(`${NS}.CatalogSeedPlace`, [
  ["Id", guid],
  ["Slug", string],
  ["Type", string],
  ["Names", list(placeNameSchema)],
  ["Latitude", nullableDouble],
  ["Longitude", nullableDouble],
  ["WikidataId", string],
  ["CuisineArea", string],
  ["CountryName", string],
  ["Summary", string],
  ["SignatureDishes", list(string)],
]);
export const catalogSeedManifestSchema = record(`${NS}.CatalogSeedManifest`, [
  ["SchemaVersion", int],
  ["SeedId", string],
  ["SourceRevision", string],
  ["PayloadFile", string],
  ["PayloadSha256", string],
  ["RecipeCount", int],
  ["PlaceCount", int],
  ["SourceFiles", list(string)],
]);
export const catalogSeedPackageSchema = record(`${NS}.CatalogSeedPackage`, [
  ["SchemaVersion", int],
  ["SeedId", string],
  ["SourceRevision", string],
  ["Recipes", list(recipeSchema)],
  ["Places", list(placeSchema)],
]);

export interface CatalogSeedManifest {
  SchemaVersion: number;
  SeedId: string | null;
  SourceRevision: string | null;
  PayloadFile: string | null;
  PayloadSha256: string | null;
  RecipeCount: number;
  PlaceCount: number;
  SourceFiles: Array<string | null> | null;
}
export interface CatalogSeedIngredient { Name: string | null; Quantity: DotnetDecimal | null; Unit: string | null; PreparationNote: string | null }
export interface CatalogSeedStep { Title: string | null; Instruction: string | null; DurationMinutes: number | null }
export interface CatalogSeedSource { SourceUrl: string | null; SourceName: string | null; LicenseCode: string | null; RetrievedAt: Instant; ExternalId: string | null }
export interface CatalogSeedMedia {
  Id: string; Provider: string | null; ExternalId: string | null; SourceUrl: string | null; ContentType: string | null;
  AltText: string | null; Creator: string | null; LicenseCode: string | null; LicenseUrl: string | null; RightsStatus: string | null;
  Position: number; IsPrimary: boolean; CreatedAt: Instant; Width: number | null; Height: number | null;
}
export interface CatalogSeedRecipe {
  Id: string; Slug: string | null; Status: string | null; OriginalLocale: string | null; Title: string | null; Summary: string | null;
  CulturalNote: string | null; Servings: number; PreparationMinutes: number | null; CookingMinutes: number | null;
  CreatedAt: Instant; PublishedAt: Instant | null; PlaceSlug: string | null; PlaceRelationType: string | null;
  Ingredients: Array<CatalogSeedIngredient | null> | null; Steps: Array<CatalogSeedStep | null> | null;
  Sources: Array<CatalogSeedSource | null> | null; Media: Array<CatalogSeedMedia | null> | null;
}
export interface CatalogSeedPlace {
  Id: string; Slug: string | null; Type: string | null; Names: Array<{ Locale: string | null; Name: string | null } | null> | null;
  Latitude: number | null; Longitude: number | null; WikidataId: string | null; CuisineArea: string | null;
  CountryName: string | null; Summary: string | null; SignatureDishes: Array<string | null> | null;
}
export interface CatalogSeedPackage {
  SchemaVersion: number;
  SeedId: string | null;
  SourceRevision: string | null;
  Recipes: Array<CatalogSeedRecipe | null> | null;
  Places: Array<CatalogSeedPlace | null> | null;
}
export interface LoadedCatalogSeedPackage {
  Manifest: CatalogSeedManifest;
  Payload: CatalogSeedPackage;
}

const SUPPORTED_SCHEMA_VERSION = 1;
const EXPECTED_PAYLOAD_FILE = "catalog.json";
const SEED_OPTIONS = { caseInsensitive: true };

export async function loadCatalogSeedPackage(packageDirectory: string): Promise<LoadedCatalogSeedPackage> {
  throwIfNullOrWhiteSpace(packageDirectory, "packageDirectory", isNullOrWhiteSpace);
  const fullPackageDirectory = getFullPath(packageDirectory);
  const manifestBytes = await readAllBytes(path.join(fullPackageDirectory, "manifest.json"));
  const manifest = deserialize(manifestBytes, catalogSeedManifestSchema, SEED_OPTIONS) as unknown as CatalogSeedManifest | null;
  if (manifest === null) throw invalidData("The catalog seed manifest is empty.");

  if (manifest.PayloadFile !== EXPECTED_PAYLOAD_FILE) {
    throw invalidData(`The catalog seed payload must be named '${EXPECTED_PAYLOAD_FILE}'.`);
  }

  const payloadBytes = await readAllBytes(path.join(fullPackageDirectory, EXPECTED_PAYLOAD_FILE));
  verifyChecksum(payloadBytes, manifest.PayloadSha256);

  const payload = deserialize(payloadBytes, catalogSeedPackageSchema, SEED_OPTIONS) as unknown as CatalogSeedPackage | null;
  if (payload === null) throw invalidData("The catalog seed payload is empty.");
  validate(manifest, payload);
  return { Manifest: manifest, Payload: payload };
}

/** Convert.FromHexString + SHA256 + CryptographicOperations.FixedTimeEquals. */
function verifyChecksum(payloadBytes: Buffer, expectedHashText: string | null): void {
  if (expectedHashText === null) throw argumentNullException("s");
  if (expectedHashText.length % 2 !== 0 || !/^[0-9A-Fa-f]*$/.test(expectedHashText)) {
    throw invalidData("The catalog seed manifest contains an invalid SHA-256 value.");
  }
  const expectedHash = Buffer.from(expectedHashText, "hex");
  const actualHash = createHash("sha256").update(payloadBytes).digest();
  if (expectedHash.length !== actualHash.length || !timingSafeEqual(expectedHash, actualHash)) {
    throw invalidData("The catalog seed payload does not match its SHA-256 manifest checksum.");
  }
}

function isHttpsUrl(value: string | null): boolean {
  const uri = httpsUriFacts(value);
  return uri.https && uri.userInfo.length === 0;
}

/** Enumerable.GroupBy(...).FirstOrDefault(group => group.Skip(1).Any()) over keys in first-seen order. */
function ensureUnique(values: Array<string | null>, label: string): void {
  const counts = new Map<string | null, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  for (const [key, count] of counts) {
    if (count > 1) throw invalidData(`Catalog seed contains duplicate ${label} '${key ?? ""}'.`);
  }
}

function validate(manifest: CatalogSeedManifest, payload: CatalogSeedPackage): void {
  if (manifest.SchemaVersion !== SUPPORTED_SCHEMA_VERSION || payload.SchemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw invalidData(`Unsupported catalog seed schema version. Expected ${SUPPORTED_SCHEMA_VERSION}.`);
  }
  if (manifest.SeedId !== payload.SeedId || manifest.SourceRevision !== payload.SourceRevision) {
    throw invalidData("Catalog seed manifest identity does not match the payload.");
  }
  const recipes = deref(payload.Recipes);
  if (manifest.RecipeCount !== recipes.length || manifest.PlaceCount !== deref(payload.Places).length) {
    throw invalidData("Catalog seed manifest counts do not match the payload.");
  }
  const places = deref(payload.Places);

  ensureUnique(recipes.map((recipe) => deref(recipe).Id), "recipe ID");
  ensureUnique(recipes.map((recipe) => deref(recipe).Slug), "recipe slug");
  const allMedia = recipes.flatMap((recipe) => deref(recipe).Media ?? []);
  ensureUnique(allMedia.map((media) => deref(media).Id), "media ID");
  ensureUnique(allMedia.map((media) => `${deref(media).Provider ?? ""}\u0000${deref(media).ExternalId ?? ""}`), "media provider/external ID");
  ensureUnique(places.map((place) => deref(place).Id), "place ID");
  ensureUnique(places.map((place) => deref(place).Slug), "place slug");

  for (const maybeRecipe of recipes) {
    const recipe = deref(maybeRecipe);
    if (recipe.Id === EMPTY_GUID || isNullOrWhiteSpace(recipe.Slug)) {
      throw invalidData("Every recipe must have a stable ID and slug.");
    }
    const status = tryParseEnum(PUBLICATION_STATUS, recipe.Status);
    const statusName = status === undefined ? undefined : enumName(PUBLICATION_STATUS, status);
    if (statusName !== "Draft" && statusName !== "Published") {
      throw invalidData(`Recipe '${recipe.Slug}' has an unsupported seed status.`);
    }
    if (recipe.PlaceSlug !== null && isNullOrWhiteSpace(recipe.PlaceSlug)) {
      throw invalidData(`Recipe '${recipe.Slug}' has an invalid place slug.`);
    }
    if (recipe.PlaceSlug === null && recipe.PlaceRelationType !== null) {
      throw invalidData(`Recipe '${recipe.Slug}' cannot define a place relation type without a place slug.`);
    }
    if (recipe.PlaceRelationType !== null) {
      const relation = tryParseEnum(RECIPE_PLACE_RELATION_TYPE, recipe.PlaceRelationType);
      if (relation === undefined || !isDefinedEnum(RECIPE_PLACE_RELATION_TYPE, relation)) {
        throw invalidData(`Recipe '${recipe.Slug}' has an unsupported place relation type.`);
      }
    }
    const sources = deref(recipe.Sources);
    if (sources.length === 0) throw invalidData(`Recipe '${recipe.Slug}' requires at least one source attribution.`);
    for (const maybeSource of sources) {
      const source = deref(maybeSource);
      if (!httpsUriFacts(source.SourceUrl).https || isNullOrWhiteSpace(source.SourceName) || isNullOrWhiteSpace(source.LicenseCode)) {
        throw invalidData(`Recipe '${recipe.Slug}' has invalid source attribution.`);
      }
    }

    const mediaItems = recipe.Media ?? [];
    if (mediaItems.length > 10) throw invalidData(`Recipe '${recipe.Slug}' exceeds the media import limit.`);
    const media = mediaItems.map(deref);
    if (media.filter((item) => item.IsPrimary).length > 1 || new Set(media.map((item) => item.Position)).size !== media.length) {
      throw invalidData(`Recipe '${recipe.Slug}' has invalid media positions or primary flags.`);
    }
    for (const item of media) {
      const rights = tryParseEnum(MEDIA_RIGHTS_STATUS, item.RightsStatus);
      if (
        item.Id === EMPTY_GUID ||
        item.Position < 1 || item.Position > 1000 ||
        rights === undefined || !isDefinedEnum(MEDIA_RIGHTS_STATUS, rights) ||
        !isHttpsUrl(item.SourceUrl) ||
        !isHttpsUrl(item.LicenseUrl) ||
        isNullOrWhiteSpace(item.Provider) ||
        isNullOrWhiteSpace(item.ExternalId) ||
        (item.Width !== null) !== (item.Height !== null) ||
        (item.Width !== null && (item.Width < 1 || item.Width > 32768)) ||
        (item.Height !== null && (item.Height < 1 || item.Height > 32768))
      ) {
        throw invalidData(`Recipe '${recipe.Slug}' has invalid media metadata.`);
      }
    }

    if (statusName === "Published" && (recipe.PublishedAt === null || deref(recipe.Ingredients).length === 0 || deref(recipe.Steps).length === 0)) {
      throw invalidData(`Published recipe '${recipe.Slug}' is incomplete.`);
    }
    if (statusName === "Draft" && recipe.PublishedAt !== null) {
      throw invalidData(`Draft recipe '${recipe.Slug}' cannot have a publication time.`);
    }
  }

  for (const maybePlace of places) {
    const place = deref(maybePlace);
    if (place.Id === EMPTY_GUID || isNullOrWhiteSpace(place.Slug) || deref(place.Names).length === 0) {
      throw invalidData("Every place must have a stable ID, slug, and localized name.");
    }
    if (tryParseEnum(PLACE_TYPE, place.Type) === undefined) {
      throw invalidData(`Place '${place.Slug}' has an unsupported type.`);
    }
    if (
      (place.Latitude !== null) !== (place.Longitude !== null) ||
      (place.Latitude !== null && (place.Latitude < -90 || place.Latitude > 90)) ||
      (place.Longitude !== null && (place.Longitude < -180 || place.Longitude > 180))
    ) {
      throw invalidData(`Place '${place.Slug}' has invalid coordinates.`);
    }
  }
}
