// Port of server/tools/Savora.MethodRepairer: replaces the method (steps) of published recipes with
// reviewed corrections by publishing a new immutable version per recipe, in one Serializable transaction.
import { stat } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { compareCultureStrings } from "../../../domain/catalog";
import type { DotnetDecimal } from "../../../domain/dotnet/decimal";
import { deref, invalidOperation } from "../../../domain/dotnet/errors";
import { type Instant, isDefaultInstant } from "../../../domain/dotnet/instant";
import { httpsUriFacts } from "../../../domain/dotnet/uri";
import type { RecipeStep } from "../../../domain/model/recipe";
import { isNullOrWhiteSpace } from "../../../domain/text";
import { recipes } from "../../db/schema";
import { decimal, deserialize, dto, int, list, nullableInt, record, string } from "../../dotnet/stj";
import { readAllBytes } from "../file-io";
import { includeVersions, toRecipe } from "../recipe-aggregates";
import type { ToolSession } from "../tool-database";
import { UnitOfWork } from "../unit-of-work";

const stepSchema = record("MethodRepairStep", [
  ["Title", string],
  ["Instruction", string],
  ["DurationMinutes", nullableInt],
]);
const sourceSchema = record("MethodRepairSource", [
  ["SourceUrl", string],
  ["SourceName", string],
  ["LicenseCode", string],
  ["RetrievedAt", dto],
  ["ExternalId", string],
]);
const itemSchema = record("MethodRepairItem", [
  ["RecipeSlug", string],
  ["BasedOnVersion", int],
  ["ExpectedStepCount", int],
  ["SourceExternalId", string],
  ["SourceUrl", string],
  ["SourceCoverage", decimal],
  ["Steps", list(stepSchema)],
  ["AdditionalSources", list(sourceSchema)],
]);
export const methodRepairPackageSchema = record("MethodRepairPackage", [
  ["SchemaVersion", int],
  ["Decision", string],
  ["GeneratedAt", dto],
  ["ApprovedAt", dto],
  ["ReviewedBy", string],
  ["ReviewNote", string],
  ["Corrections", list(itemSchema)],
]);

interface MethodRepairStep { Title: string | null; Instruction: string | null; DurationMinutes: number | null }
interface MethodRepairSource { SourceUrl: string | null; SourceName: string | null; LicenseCode: string | null; RetrievedAt: Instant; ExternalId: string | null }
interface MethodRepairItem {
  RecipeSlug: string | null; BasedOnVersion: number; ExpectedStepCount: number; SourceExternalId: string | null; SourceUrl: string | null;
  SourceCoverage: DotnetDecimal; Steps: Array<MethodRepairStep | null> | null; AdditionalSources: Array<MethodRepairSource | null> | null;
}
export interface MethodRepairPackage {
  SchemaVersion: number; Decision: string | null; GeneratedAt: Instant; ApprovedAt: Instant; ReviewedBy: string | null; ReviewNote: string | null;
  Corrections: Array<MethodRepairItem | null> | null;
}

export interface MethodRepairResult {
  repaired: number;
  unchanged: number;
  entries: number;
}

/** new JsonSerializerOptions { PropertyNameCaseInsensitive = true } over File.ReadAllTextAsync (BOM stripped). */
export async function loadMethodRepairPackage(packagePath: string): Promise<MethodRepairPackage> {
  let size = -1;
  try {
    const info = await stat(packagePath);
    if (info.isFile()) size = info.size;
  } catch {
    size = -1;
  }
  if (size < 2 || size > 10_000_000) {
    throw invalidOperation("The repair package is missing, empty, or larger than 10 MB.");
  }
  let bytes = await readAllBytes(packagePath);
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) bytes = bytes.subarray(3);
  const parsed = deserialize(bytes, methodRepairPackageSchema, { caseInsensitive: true, skipUnmapped: true, strictNumbers: true });
  if (parsed === null) throw invalidOperation("The repair package could not be parsed.");
  const pkg = parsed as unknown as MethodRepairPackage;
  validatePackage(pkg);
  return pkg;
}

function validatePackage(pkg: MethodRepairPackage): void {
  const corrections = deref(pkg.Corrections);
  if (pkg.SchemaVersion !== 1 || pkg.Decision !== "RepairPublishedMethods" || corrections.length < 1 || corrections.length > 500) {
    throw invalidOperation("The repair package schema, decision, or correction count is invalid.");
  }
  if (isDefaultInstant(pkg.ApprovedAt) || isNullOrWhiteSpace(pkg.ReviewedBy) || isNullOrWhiteSpace(pkg.ReviewNote)) {
    throw invalidOperation("The repair approval metadata is incomplete.");
  }
  for (const maybeCorrection of corrections) {
    const correction = deref(maybeCorrection);
    const steps = deref(correction.Steps);
    if (
      isNullOrWhiteSpace(correction.RecipeSlug) ||
      correction.BasedOnVersion < 1 ||
      steps.length === 0 ||
      steps.length > 50 ||
      !deref(correction.SourceExternalId).startsWith("themealdb:")
    ) {
      throw invalidOperation(`${correction.RecipeSlug ?? ""}: the correction preconditions are invalid.`);
    }
    if (steps.some((step) => isNullOrWhiteSpace(deref(step).Instruction))) {
      throw invalidOperation(`${correction.RecipeSlug}: corrected instructions cannot be empty.`);
    }
    const additional = correction.AdditionalSources;
    if (
      additional !== null &&
      (additional.length > 5 ||
        additional.some((maybeSource) => {
          const source = deref(maybeSource);
          return (
            isNullOrWhiteSpace(source.SourceName) ||
            isNullOrWhiteSpace(source.LicenseCode) ||
            isNullOrWhiteSpace(source.ExternalId) ||
            !httpsUriFacts(source.SourceUrl).https
          );
        }))
    ) {
      throw invalidOperation(`${correction.RecipeSlug}: additional source metadata is invalid.`);
    }
  }
}

/** Record equality of MethodRepairStep over the current steps ordered by position. */
function stepsEqual(current: readonly RecipeStep[], requested: ReadonlyArray<MethodRepairStep | null>): boolean {
  const ordered = [...current].sort((a, b) => a.position - b.position);
  if (ordered.length !== requested.length) return false;
  return ordered.every((step, index) => {
    const other = requested[index];
    return other !== null && other !== undefined && step.title === other.Title && step.instruction === other.Instruction && step.durationMinutes === other.DurationMinutes;
  });
}

export async function repairMethods(session: ToolSession, pkg: MethodRepairPackage): Promise<MethodRepairResult> {
  const pending = await session.pendingMigrations();
  if (pending.length > 0) throw invalidOperation(`Apply the reviewed migrations first (${pending.length} pending).`);

  return session.transaction(async () => {
    let repaired = 0;
    let unchanged = 0;
    const corrections = deref(pkg.Corrections).map((item) => deref(item));
    const ordered = [...corrections].sort((a, b) => compareCultureStrings(a.RecipeSlug ?? "", b.RecipeSlug ?? ""));
    for (const correction of ordered) {
      const rows = correction.RecipeSlug === null ? [] : await session.db.select().from(recipes).where(eq(recipes.slug, correction.RecipeSlug)).limit(2);
      if (rows.length === 0) throw invalidOperation("Sequence contains no elements.");
      if (rows.length > 1) throw invalidOperation("Sequence contains more than one element.");
      const recipe = toRecipe(rows[0]!);
      await includeVersions(session, [recipe]);
      const unit = new UnitOfWork(session);
      unit.trackRecipe(recipe);

      if (recipe.status !== "Published" || recipe.currentVersionId === null) {
        throw invalidOperation(`${recipe.slug}: only a published recipe can be repaired.`);
      }
      const currentMatches = recipe.versions.filter((version) => version.id === recipe.currentVersionId);
      if (currentMatches.length !== 1) throw invalidOperation(currentMatches.length === 0 ? "Sequence contains no matching element" : "Sequence contains more than one matching element");
      const current = currentMatches[0]!;
      const steps = deref(correction.Steps);
      const additional = correction.AdditionalSources;
      if (
        stepsEqual(current.steps, steps) &&
        (additional === null || additional.every((source) => current.sources.some((existing) => existing.externalId === deref(source).ExternalId)))
      ) {
        unchanged++;
        continue;
      }
      if (
        current.versionNumber !== correction.BasedOnVersion ||
        current.steps.length !== correction.ExpectedStepCount ||
        !current.sources.some((source) => source.externalId === correction.SourceExternalId)
      ) {
        throw invalidOperation(`${recipe.slug}: current data no longer matches the reviewed repair package.`);
      }

      const revised = recipe.addVersion(current.originalLocale, current.servings, current.preparationMinutes, current.cookingMinutes, pkg.ApprovedAt);
      for (const translation of [...current.translations].sort((a, b) => compareCultureStrings(a.locale, b.locale))) {
        revised.addTranslation(translation.locale, translation.title, translation.summary, translation.culturalNote, translation.isMachineTranslated);
      }
      for (const ingredient of [...current.ingredients].sort((a, b) => a.position - b.position)) {
        revised.addIngredient(ingredient.name, ingredient.quantity, ingredient.unit, ingredient.preparationNote);
      }
      for (const step of steps) {
        const value = deref(step);
        revised.addStep(deref(value.Instruction), value.Title, value.DurationMinutes);
      }
      for (const source of [...current.sources].sort((a, b) => compareCultureStrings(a.sourceName, b.sourceName))) {
        revised.addSource(source.sourceUrl, source.sourceName, source.licenseCode, source.retrievedAt, source.externalId);
      }
      for (const maybeSource of additional ?? []) {
        const source = deref(maybeSource);
        if (!current.sources.some((existing) => existing.externalId === source.ExternalId)) {
          revised.addSource(deref(source.SourceUrl), deref(source.SourceName), deref(source.LicenseCode), source.RetrievedAt, source.ExternalId);
        }
      }

      await unit.saveChanges();
      recipe.publishRevision(revised.id, pkg.ApprovedAt);
      await unit.saveChanges();
      repaired++;
    }
    return { repaired, unchanged, entries: corrections.length };
  }, "Serializable");
}
