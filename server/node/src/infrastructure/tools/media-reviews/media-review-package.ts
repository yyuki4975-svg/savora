// Port of Savora.Infrastructure.MediaReviews (MediaReviewPackage records, MediaReviewPackageLoader,
// MediaReviewManifestRegistry).
import { createHash } from "node:crypto";
import { existsSync, statSync } from "node:fs";
import { open } from "node:fs/promises";
import path from "node:path";
import { DotnetException, invalidData, throwIfNullOrWhiteSpace } from "../../../domain/dotnet/errors";
import { MEDIA_REVIEW_DECISION_TYPE, enumName, isDefinedEnum, tryParseEnum } from "../../../domain/dotnet/enum";
import { type Instant, isDefaultInstant } from "../../../domain/dotnet/instant";
import { compareOrdinalIgnoreCase } from "../../../domain/catalog";
import { dotnetTrim, isNullOrWhiteSpace } from "../../../domain/text";
import { bool, deserialize, dto, int, list, nullableDto, record, string } from "../../dotnet/stj";
import { getFullPath } from "../file-io";

const NS = "Savora.Infrastructure.MediaReviews";

const checksSchema = record(`${NS}.MediaReviewChecks`, [
  ["Recipe", bool],
  ["Visual", bool],
  ["Rights", bool],
  ["Quality", bool],
]);
const decisionSchema = record(`${NS}.MediaReviewExportDecision`, [
  ["RecipeSlug", string],
  ["CandidateProviderId", string],
  ["Checks", checksSchema],
  ["Decision", string],
  ["Note", string],
]);
export const reviewExportSchema = record(`${NS}.MediaReviewExportFile`, [
  ["SchemaVersion", int],
  ["BatchId", string],
  ["ExportedAt", dto],
  ["Scope", string],
  ["Decisions", list(decisionSchema)],
]);
const visualReviewSchema = record(`${NS}.MediaCandidateVisualReview`, [
  ["Scope", string],
  ["RecordedAt", dto],
  ["AcceptedRecipeSlugs", list(string)],
  ["AwaitingReplacementReviewSlugs", list(string)],
  ["RightsStatusUnaffected", bool],
]);
const assetSchema = record(`${NS}.MediaCandidateManifestAsset`, [
  ["SourceType", string],
  ["Provider", string],
  ["ProviderId", string],
  ["Title", string],
  ["Creator", string],
  ["LicenseCode", string],
  ["LicenseUrl", string],
  ["RightsStatus", string],
  ["LandingPageUrl", string],
  ["OriginalUrl", string],
  ["ContentType", string],
  ["Width", int],
  ["Height", int],
  ["Sha256", string],
  ["GeneratedAt", nullableDto],
  ["GenerationPromptSummary", string],
  ["AltTextDraft", string],
]);
const manifestRecordSchema = record(`${NS}.MediaCandidateManifestRecord`, [
  ["RecipeSlug", string],
  ["RecipeTitle", string],
  ["Status", string],
  ["SearchQuery", string],
  ["Confidence", string],
  ["MatchRationale", string],
  ["Warnings", list(string)],
  ["ReviewNote", string],
  ["Asset", assetSchema],
]);
export const candidateManifestSchema = record(`${NS}.MediaCandidateManifestFile`, [
  ["SchemaVersion", int],
  ["BatchId", string],
  ["RecipeSourceId", string],
  ["RetrievedAt", dto],
  ["ReviewState", string],
  ["ProductionUseAllowed", bool],
  ["VisualReview", visualReviewSchema],
  ["SearchWorkflow", string],
  ["Records", list(manifestRecordSchema)],
]);

export interface MediaReviewChecks { Recipe: boolean; Visual: boolean; Rights: boolean; Quality: boolean }
export interface MediaReviewExportDecision {
  RecipeSlug: string | null;
  CandidateProviderId: string | null;
  Checks: MediaReviewChecks | null;
  Decision: string | null;
  Note: string | null;
}
export interface MediaReviewExportFile {
  SchemaVersion: number;
  BatchId: string | null;
  ExportedAt: Instant;
  Scope: string | null;
  Decisions: Array<MediaReviewExportDecision | null> | null;
}
export interface MediaCandidateManifestAsset {
  SourceType: string | null; Provider: string | null; ProviderId: string | null; Title: string | null; Creator: string | null;
  LicenseCode: string | null; LicenseUrl: string | null; RightsStatus: string | null; LandingPageUrl: string | null;
  OriginalUrl: string | null; ContentType: string | null; Width: number; Height: number; Sha256: string | null;
  GeneratedAt: Instant | null; GenerationPromptSummary: string | null; AltTextDraft: string | null;
}
export interface MediaCandidateManifestRecord {
  RecipeSlug: string | null; RecipeTitle: string | null; Status: string | null; SearchQuery: string | null;
  Confidence: string | null; MatchRationale: string | null; Warnings: Array<string | null> | null; ReviewNote: string | null;
  Asset: MediaCandidateManifestAsset | null;
}
export interface MediaCandidateManifestFile {
  SchemaVersion: number; BatchId: string | null; RecipeSourceId: string | null; RetrievedAt: Instant; ReviewState: string | null;
  ProductionUseAllowed: boolean;
  VisualReview: { Scope: string | null; RecordedAt: Instant; AcceptedRecipeSlugs: Array<string | null> | null; AwaitingReplacementReviewSlugs: Array<string | null> | null; RightsStatusUnaffected: boolean } | null;
  SearchWorkflow: string | null;
  Records: Array<MediaCandidateManifestRecord | null> | null;
}
export interface LoadedMediaReviewPackage {
  Review: MediaReviewExportFile;
  Manifest: MediaCandidateManifestFile;
  PayloadSha256: string;
  ManifestSha256: string;
}

const SUPPORTED_SCHEMA_VERSION = 1;
const MAX_REVIEW_BYTES = 1024 * 1024;
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;
const MAX_RECORDS = 10_000;
const REQUIRED_SCOPE = "LocalEditorialReviewOnly";
const REQUIRED_REVIEW_STATE = "EditorialReviewRequired";
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*\n?$/;
const REVIEW_OPTIONS = { caseInsensitive: false };

export async function loadMediaReviewPackage(reviewPath: string, manifestPath: string): Promise<LoadedMediaReviewPackage> {
  const reviewBytes = await readBoundedJsonFile(reviewPath, MAX_REVIEW_BYTES, "review export");
  const manifestBytes = await readBoundedJsonFile(manifestPath, MAX_MANIFEST_BYTES, "candidate manifest");
  const review = deserializeFile(reviewBytes, "review export", reviewExportSchema) as unknown as MediaReviewExportFile;
  const manifest = deserializeFile(manifestBytes, "candidate manifest", candidateManifestSchema) as unknown as MediaCandidateManifestFile;
  validate(review, manifest);
  return {
    Review: review,
    Manifest: manifest,
    PayloadSha256: createHash("sha256").update(reviewBytes).digest("hex"),
    ManifestSha256: createHash("sha256").update(manifestBytes).digest("hex"),
  };
}

async function readBoundedJsonFile(filePath: string, maxBytes: number, label: string): Promise<Buffer> {
  throwIfNullOrWhiteSpace(filePath, "path", isNullOrWhiteSpace);
  const fullPath = getFullPath(filePath);
  if (compareOrdinalIgnoreCase(path.extname(fullPath), ".json") !== 0) {
    throw invalidData(`The ${label} must be a .json file.`);
  }
  let handle;
  try {
    handle = await open(fullPath, "r");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      const directory = path.dirname(fullPath);
      if (!existsSync(directory) || !statSync(directory).isDirectory()) {
        throw new DotnetException("System.IO.DirectoryNotFoundException", `Could not find a part of the path '${fullPath}'.`);
      }
      throw new DotnetException("System.IO.FileNotFoundException", `Could not find file '${fullPath}'.`);
    }
    throw error;
  }
  try {
    const { size } = await handle.stat();
    if (size === 0 || size > maxBytes) {
      throw invalidData(`The ${label} must contain between 1 and ${maxBytes} bytes.`);
    }
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

function deserializeFile(bytes: Buffer, label: string, schema: typeof reviewExportSchema): Record<string, unknown> {
  let value;
  try {
    value = deserialize(bytes, schema, REVIEW_OPTIONS);
  } catch (error) {
    if (error instanceof DotnetException && error.dotnetType === "System.Text.Json.JsonException") {
      throw invalidData(`The ${label} does not match schema version 1.`, error);
    }
    throw error;
  }
  if (value === null) throw invalidData(`The ${label} contains JSON null.`);
  return value;
}

function requireText(value: string | null, maxLength: number, fieldName: string): asserts value is string {
  if (isNullOrWhiteSpace(value) || value!.length > maxLength || value !== dotnetTrim(value!)) {
    throw invalidData(`${fieldName} must be nonblank, trimmed, and at most ${maxLength} characters.`);
  }
}

function requireBatchId(value: string | null, fieldName: string): void {
  requireText(value, 120, fieldName);
  if (!SLUG.test(value)) {
    throw invalidData(`${fieldName} must contain lowercase ASCII letters, numbers, and single hyphens only.`);
  }
}

function requireSlug(value: string | null, fieldName: string): asserts value is string {
  requireText(value, 120, fieldName);
  if (!SLUG.test(value)) throw invalidData(`${fieldName} is not a canonical lowercase slug.`);
}

function validate(review: MediaReviewExportFile, manifest: MediaCandidateManifestFile): void {
  if (review.SchemaVersion !== SUPPORTED_SCHEMA_VERSION || manifest.SchemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw invalidData("Only media review schema version 1 is supported.");
  }
  requireBatchId(review.BatchId, "review batchId");
  requireBatchId(manifest.BatchId, "manifest batchId");
  if (review.BatchId !== manifest.BatchId) throw invalidData("The review export and candidate manifest batch IDs differ.");
  if (review.Scope !== REQUIRED_SCOPE) throw invalidData(`Review scope must be '${REQUIRED_SCOPE}'.`);
  if (isDefaultInstant(review.ExportedAt)) throw invalidData("Review exportedAt is required.");
  if (manifest.ReviewState !== REQUIRED_REVIEW_STATE || manifest.ProductionUseAllowed) {
    throw invalidData("The manifest must require editorial review and prohibit production use.");
  }
  if (review.Decisions === null || review.Decisions.length === 0 || review.Decisions.length > MAX_RECORDS) {
    throw invalidData(`Review decisions must contain between 1 and ${MAX_RECORDS} records.`);
  }
  if (manifest.Records === null || manifest.Records.length === 0 || manifest.Records.length > MAX_RECORDS || review.Decisions.length !== manifest.Records.length) {
    throw invalidData("The review must contain exactly one entry for every manifest record.");
  }
  requireText(manifest.RecipeSourceId, 240, "manifest recipeSourceId");
  requireText(manifest.SearchWorkflow, 2000, "manifest searchWorkflow");

  const manifestBySlug = new Map<string, MediaCandidateManifestRecord>();
  for (const record of manifest.Records) {
    if (record === null) throw invalidData("Manifest records cannot contain null.");
    validateManifestRecord(record);
    if (manifestBySlug.has(record.RecipeSlug!)) throw invalidData(`Duplicate manifest recipe slug '${record.RecipeSlug}'.`);
    manifestBySlug.set(record.RecipeSlug!, record);
  }
  validateVisualReview(manifest, [...manifestBySlug.keys()]);

  const reviewSlugs = new Set<string>();
  let completedDecisionCount = 0;
  for (const exportedDecision of review.Decisions) {
    if (exportedDecision === null) throw invalidData("Review decisions cannot contain null.");
    requireSlug(exportedDecision.RecipeSlug, "review recipeSlug");
    if (reviewSlugs.has(exportedDecision.RecipeSlug)) throw invalidData(`Duplicate review recipe slug '${exportedDecision.RecipeSlug}'.`);
    reviewSlugs.add(exportedDecision.RecipeSlug);
    const manifestRecord = manifestBySlug.get(exportedDecision.RecipeSlug);
    if (manifestRecord === undefined) {
      throw invalidData(`Recipe '${exportedDecision.RecipeSlug}' is not present in the candidate manifest.`);
    }
    validateDecision(exportedDecision, manifestRecord);
    if (exportedDecision.Decision !== null) completedDecisionCount++;
  }
  if (completedDecisionCount === 0) throw invalidData("The review export contains no completed editorial decisions.");
}

function validateVisualReview(manifest: MediaCandidateManifestFile, manifestRecordSlugs: string[]): void {
  const visualReview = manifest.VisualReview;
  if (visualReview === null) throw invalidData("Manifest visualReview is required.");
  if (visualReview.Scope !== "VisualFitOnly" || !visualReview.RightsStatusUnaffected || isDefaultInstant(visualReview.RecordedAt)) {
    throw invalidData("Manifest visual review must be visual-fit-only and must leave rights status unchanged.");
  }
  const accepted = toUniqueSlugSet(visualReview.AcceptedRecipeSlugs, "acceptedRecipeSlugs");
  const awaiting = toUniqueSlugSet(visualReview.AwaitingReplacementReviewSlugs, "awaitingReplacementReviewSlugs");
  if ([...accepted].some((slug) => awaiting.has(slug))) throw invalidData("Visual review slug groups must not overlap.");
  const reviewed = new Set([...accepted, ...awaiting]);
  const manifestSlugs = new Set(manifestRecordSlugs);
  if (reviewed.size !== manifestSlugs.size || [...reviewed].some((slug) => !manifestSlugs.has(slug))) {
    throw invalidData("Visual review slug groups must partition all manifest records.");
  }
}

function toUniqueSlugSet(values: Array<string | null> | null, fieldName: string): Set<string> {
  if (values === null) throw invalidData(`Manifest ${fieldName} is required.`);
  const result = new Set<string>();
  for (const value of values) {
    requireSlug(value, `manifest ${fieldName}`);
    if (result.has(value)) throw invalidData(`Manifest ${fieldName} contains duplicate slug '${value}'.`);
    result.add(value);
  }
  return result;
}

function validateManifestRecord(record: MediaCandidateManifestRecord): void {
  requireSlug(record.RecipeSlug, "manifest recipeSlug");
  requireText(record.RecipeTitle, 240, "manifest recipeTitle");
  requireText(record.SearchQuery, 1000, "manifest searchQuery");
  if (record.Warnings === null || record.Warnings.length > 100) {
    throw invalidData("Manifest warnings are required and limited to 100 entries.");
  }
  if (record.Status === "Candidate") {
    const asset = record.Asset;
    if (asset === null) throw invalidData(`Candidate '${record.RecipeSlug}' has no asset.`);
    requireText(asset.ProviderId, 240, "manifest asset providerId");
    requireText(asset.Provider, 120, "manifest asset provider");
    if (asset.RightsStatus !== "Pending") throw invalidData(`Candidate '${record.RecipeSlug}' must retain Pending rights status.`);
    if (asset.Width < 1 || asset.Width > 32768 || asset.Height < 1 || asset.Height > 32768) {
      throw invalidData(`Candidate '${record.RecipeSlug}' has invalid dimensions.`);
    }
    return;
  }
  if (record.Status !== "NoSuitableMatch" || record.Asset !== null) {
    throw invalidData(`Manifest record '${record.RecipeSlug}' has an unsupported status or asset combination.`);
  }
}

function validateDecision(exportedDecision: MediaReviewExportDecision, manifestRecord: MediaCandidateManifestRecord): void {
  const expectedProviderId = manifestRecord.Asset?.ProviderId ?? null;
  if (exportedDecision.CandidateProviderId !== expectedProviderId) {
    throw invalidData(`Candidate asset changed for recipe '${exportedDecision.RecipeSlug}'.`);
  }
  const checks = exportedDecision.Checks;
  if (checks === null) throw invalidData(`Review checks are required for recipe '${exportedDecision.RecipeSlug}'.`);
  if (exportedDecision.Note !== null && exportedDecision.Note.length > 2000) {
    throw invalidData(`Review note for recipe '${exportedDecision.RecipeSlug}' exceeds 2000 characters.`);
  }
  if (exportedDecision.Decision === null) return;

  const decision = tryParseEnum(MEDIA_REVIEW_DECISION_TYPE, exportedDecision.Decision);
  if (decision === undefined || !isDefinedEnum(MEDIA_REVIEW_DECISION_TYPE, decision)) {
    throw invalidData(`Recipe '${exportedDecision.RecipeSlug}' has an unsupported decision.`);
  }
  if (!checks.Recipe || !checks.Visual) {
    throw invalidData(`Completed decision for '${exportedDecision.RecipeSlug}' requires recipe and visual checks.`);
  }
  const name = enumName(MEDIA_REVIEW_DECISION_TYPE, decision);
  if (name === "VisuallyAccepted" && (!checks.Rights || !checks.Quality)) {
    throw invalidData(`Visual acceptance for '${exportedDecision.RecipeSlug}' requires all four checks.`);
  }
  const allowed =
    manifestRecord.Status === "Candidate"
      ? ["VisuallyAccepted", "Rejected", "NeedsReplacement"].includes(name)
      : manifestRecord.Status === "NoSuitableMatch"
        ? ["ConfirmedNoMatch", "NeedsReplacement"].includes(name)
        : false;
  if (!allowed) throw invalidData(`Decision '${name}' is incompatible with manifest status '${manifestRecord.Status}'.`);
}

// ---------------------------------------------------------------- MediaReviewManifestRegistry

export const DEFAULT_BATCH_ID = "nhlbi-media-b01";
const MANIFEST_FILES: ReadonlyArray<readonly [string, string]> = [
  [DEFAULT_BATCH_ID, "recipe-media-candidates.nhlbi-b01.json"],
  ["nhlbi-media-b02", "recipe-media-candidates.nhlbi-b02.json"],
  ["nhlbi-media-backfill-b03", "recipe-media-candidates.nhlbi-b03.json"],
  ["themealdb-image-replacements-b01-review", "themealdb-image-candidates.b01.json"],
];

export interface RegisteredMediaReviewManifest {
  batchId: string;
  manifestPath: string;
}

function ensureRegisteredFileExists(manifestPath: string, batchId: string): void {
  if (!existsSync(manifestPath) || !statSync(manifestPath).isFile()) {
    throw new DotnetException("System.IO.FileNotFoundException", `The registered candidate manifest for batch '${batchId}' is missing.`);
  }
}

export function resolveByBatch(dataDirectory: string, batchId: string): RegisteredMediaReviewManifest {
  throwIfNullOrWhiteSpace(dataDirectory, "dataDirectory", isNullOrWhiteSpace);
  throwIfNullOrWhiteSpace(batchId, "batchId", isNullOrWhiteSpace);
  const registration = MANIFEST_FILES.find(([id]) => id === batchId);
  if (registration === undefined) {
    const allowed = MANIFEST_FILES.map(([id]) => id).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    throw invalidData(`Media review batch '${batchId}' is not registered. Allowed batches: ${allowed.join(", ")}.`);
  }
  const manifestPath = getFullPath(path.join(getFullPath(dataDirectory), registration[1]));
  ensureRegisteredFileExists(manifestPath, batchId);
  return { batchId, manifestPath };
}

export function resolveByPath(dataDirectory: string, manifestPath: string): RegisteredMediaReviewManifest {
  throwIfNullOrWhiteSpace(dataDirectory, "dataDirectory", isNullOrWhiteSpace);
  throwIfNullOrWhiteSpace(manifestPath, "manifestPath", isNullOrWhiteSpace);
  const dataRoot = getFullPath(dataDirectory);
  const suppliedPath = getFullPath(manifestPath);
  const windows = process.platform === "win32";
  for (const [batchId, fileName] of MANIFEST_FILES) {
    const registeredPath = getFullPath(path.join(dataRoot, fileName));
    const same = windows ? compareOrdinalIgnoreCase(suppliedPath, registeredPath) === 0 : suppliedPath === registeredPath;
    if (!same) continue;
    ensureRegisteredFileExists(registeredPath, batchId);
    return { batchId, manifestPath: registeredPath };
  }
  throw invalidData("The candidate manifest path is not registered for media-review import.");
}
