// Port of Savora.Domain.Catalog (Recipe aggregate) and Savora.Domain.Media.RecipeMediaAssociation.
// Invariants and exception texts match the C# domain; `isNew` / `modified` flags replace EF change tracking.
import { argumentException, argumentOutOfRangeException, invalidOperation } from "../dotnet/errors";
import { type DotnetDecimal, isNegativeDecimal } from "../dotnet/decimal";
import { EMPTY_GUID, createVersion7 } from "../dotnet/guid";
import { type Instant, compareInstants, isDefaultInstant } from "../dotnet/instant";
import { httpsUriFacts } from "../dotnet/uri";
import { isNullOrWhiteSpace, requireLocale, requireSlug, requireText } from "../text";

export type PublicationStatus = "Draft" | "InReview" | "Published" | "Archived";
export type RecipePlaceRelationType = "Origin" | "RegionalVariation" | "Diaspora" | "DiscoveryAnchor";
export const RELATION_TYPES: readonly RecipePlaceRelationType[] = ["Origin", "RegionalVariation", "Diaspora", "DiscoveryAnchor"];

function optionalText(value: string | null | undefined, maxLength: number, parameterName: string): string | null {
  return isNullOrWhiteSpace(value) ? null : requireText(value, maxLength, parameterName);
}

function ensureOptionalMinutes(value: number | null, parameterName: string): void {
  if (value !== null && (value < 0 || value > 10080)) {
    throw argumentOutOfRangeException(parameterName, "Duration must be between 0 and 10080 minutes.");
  }
}

export class RecipeTranslation {
  isNew = false;
  constructor(
    readonly id: string,
    readonly recipeVersionId: string,
    readonly locale: string,
    readonly title: string,
    readonly summary: string,
    readonly culturalNote: string | null,
    readonly isMachineTranslated: boolean,
  ) {}

  static create(
    recipeVersionId: string,
    locale: string,
    title: string,
    summary: string,
    culturalNote: string | null | undefined,
    isMachineTranslated: boolean,
  ): RecipeTranslation {
    const translation = new RecipeTranslation(
      createVersion7(),
      recipeVersionId,
      locale,
      requireText(title, 240, "title"),
      requireText(summary, 2000, "summary"),
      optionalText(culturalNote, 8000, "culturalNote"),
      isMachineTranslated,
    );
    translation.isNew = true;
    return translation;
  }
}

export class RecipeIngredientLine {
  isNew = false;
  constructor(
    readonly id: string,
    readonly recipeVersionId: string,
    readonly position: number,
    readonly name: string,
    readonly quantity: DotnetDecimal | null,
    readonly unit: string | null,
    readonly preparationNote: string | null,
  ) {}
}

export class RecipeStep {
  isNew = false;
  constructor(
    readonly id: string,
    readonly recipeVersionId: string,
    readonly position: number,
    readonly instruction: string,
    readonly title: string | null,
    readonly durationMinutes: number | null,
  ) {}
}

export class SourceAttribution {
  isNew = false;
  constructor(
    readonly id: string,
    readonly recipeVersionId: string,
    readonly sourceUrl: string,
    readonly sourceName: string,
    readonly licenseCode: string,
    readonly retrievedAt: Instant,
    readonly externalId: string | null,
  ) {}

  static create(
    recipeVersionId: string,
    sourceUrl: string | null,
    sourceName: string | null,
    licenseCode: string | null,
    retrievedAt: Instant,
    externalId: string | null | undefined,
  ): SourceAttribution {
    // Uri.TryCreate(..., Absolute) && Scheme == https (user info is allowed here).
    const uri = httpsUriFacts(sourceUrl);
    if (!uri.https) throw argumentException("Source URL must be an absolute HTTPS URL.", "sourceUrl");
    const source = new SourceAttribution(
      createVersion7(),
      recipeVersionId,
      uri.absoluteUri,
      requireText(sourceName, 240, "sourceName"),
      requireText(licenseCode, 80, "licenseCode"),
      retrievedAt,
      optionalText(externalId, 240, "externalId"),
    );
    source.isNew = true;
    return source;
  }
}

export class RecipeVersion {
  isNew = false;
  readonly translations: RecipeTranslation[] = [];
  readonly ingredients: RecipeIngredientLine[] = [];
  readonly steps: RecipeStep[] = [];
  readonly sources: SourceAttribution[] = [];

  constructor(
    readonly id: string,
    readonly recipeId: string,
    readonly versionNumber: number,
    readonly originalLocale: string,
    readonly servings: number,
    readonly preparationMinutes: number | null,
    readonly cookingMinutes: number | null,
    readonly createdAt: Instant,
  ) {}

  addTranslation(
    locale: string,
    title: string,
    summary: string,
    culturalNote: string | null = null,
    isMachineTranslated = false,
  ): RecipeTranslation {
    const normalizedLocale = requireLocale(locale);
    if (this.translations.some((translation) => translation.locale === normalizedLocale)) {
      throw invalidOperation(`Translation '${normalizedLocale}' already exists in this version.`);
    }
    const translation = RecipeTranslation.create(this.id, normalizedLocale, title, summary, culturalNote, isMachineTranslated);
    this.translations.push(translation);
    return translation;
  }

  addIngredient(name: string, quantity: DotnetDecimal | null, unit: string | null, preparationNote: string | null = null): RecipeIngredientLine {
    if (quantity !== null && isNegativeDecimal(quantity)) {
      throw argumentOutOfRangeException("quantity", "Ingredient quantity cannot be negative.");
    }
    const ingredient = new RecipeIngredientLine(
      createVersion7(),
      this.id,
      this.ingredients.length + 1,
      requireText(name, 240, "name"),
      quantity,
      optionalText(unit, 80, "unit"),
      optionalText(preparationNote, 500, "preparationNote"),
    );
    ingredient.isNew = true;
    this.ingredients.push(ingredient);
    return ingredient;
  }

  addStep(instruction: string, title: string | null = null, durationMinutes: number | null = null): RecipeStep {
    if (durationMinutes !== null && (durationMinutes < 0 || durationMinutes > 10080)) {
      throw argumentOutOfRangeException("durationMinutes");
    }
    const step = new RecipeStep(
      createVersion7(),
      this.id,
      this.steps.length + 1,
      requireText(instruction, 5000, "instruction"),
      optionalText(title, 160, "title"),
      durationMinutes,
    );
    step.isNew = true;
    this.steps.push(step);
    return step;
  }

  addSource(sourceUrl: string, sourceName: string, licenseCode: string, retrievedAt: Instant, externalId: string | null = null): SourceAttribution {
    const source = SourceAttribution.create(this.id, sourceUrl, sourceName, licenseCode, retrievedAt, externalId);
    this.sources.push(source);
    return source;
  }
}

export class RecipePlaceAssociation {
  isNew = false;
  constructor(
    readonly recipeId: string,
    readonly placeId: string,
    readonly relationType: RecipePlaceRelationType,
    readonly isPrimary: boolean,
  ) {}

  static create(recipeId: string, placeId: string, relationType: RecipePlaceRelationType, isPrimary: boolean): RecipePlaceAssociation {
    if (recipeId === EMPTY_GUID) throw argumentException("Recipe ID is required.", "recipeId");
    if (placeId === EMPTY_GUID) throw argumentException("Place ID is required.", "placeId");
    if (!RELATION_TYPES.includes(relationType)) throw argumentOutOfRangeException("relationType");
    const association = new RecipePlaceAssociation(recipeId, placeId, relationType, isPrimary);
    association.isNew = true;
    return association;
  }
}

export class RecipeMediaAssociation {
  isNew = false;
  constructor(
    readonly recipeId: string,
    readonly mediaAssetId: string,
    readonly position: number,
    readonly isPrimary: boolean,
  ) {}

  static create(recipeId: string, mediaAssetId: string, position: number, isPrimary: boolean): RecipeMediaAssociation {
    if (recipeId === EMPTY_GUID) throw argumentException("Recipe ID is required.", "recipeId");
    if (mediaAssetId === EMPTY_GUID) throw argumentException("Media asset ID is required.", "mediaAssetId");
    if (position < 1 || position > 1000) throw argumentOutOfRangeException("position", "Position must be between 1 and 1000.");
    const association = new RecipeMediaAssociation(recipeId, mediaAssetId, position, isPrimary);
    association.isNew = true;
    return association;
  }
}

export class Recipe {
  isNew = false;
  /** True once status/current version/timestamps change and the row needs an UPDATE. */
  modified = false;
  readonly versions: RecipeVersion[] = [];
  readonly placeAssociations: RecipePlaceAssociation[] = [];
  readonly mediaAssociations: RecipeMediaAssociation[] = [];
  /** Media links removed by ReplacePrimaryMedia (EF deletes them on SaveChanges). */
  readonly removedMediaAssociations: RecipeMediaAssociation[] = [];

  constructor(
    readonly id: string,
    readonly slug: string,
    public status: PublicationStatus,
    public currentVersionId: string | null,
    readonly createdAt: Instant,
    public updatedAt: Instant,
    public publishedAt: Instant | null,
  ) {}

  static create(slug: string, createdAt: Instant, id?: string): Recipe {
    const recipe = new Recipe(id ?? createVersion7(), requireSlug(slug), "Draft", null, createdAt, createdAt, null);
    recipe.isNew = true;
    return recipe;
  }

  addVersion(
    originalLocale: string,
    servings: number,
    preparationMinutes: number | null,
    cookingMinutes: number | null,
    createdAt: Instant,
  ): RecipeVersion {
    if (servings < 1 || servings > 1000) {
      throw argumentOutOfRangeException("servings", "Servings must be between 1 and 1000.");
    }
    ensureOptionalMinutes(preparationMinutes, "preparationMinutes");
    ensureOptionalMinutes(cookingMinutes, "cookingMinutes");
    const nextVersion = this.versions.length === 0 ? 1 : Math.max(...this.versions.map((version) => version.versionNumber)) + 1;
    const version = new RecipeVersion(
      createVersion7(),
      this.id,
      nextVersion,
      requireLocale(originalLocale),
      servings,
      preparationMinutes,
      cookingMinutes,
      createdAt,
    );
    version.isNew = true;
    this.versions.push(version);
    this.updatedAt = createdAt;
    this.modified = true;
    return version;
  }

  addPlace(placeId: string, relationType: RecipePlaceRelationType, isPrimary = false): RecipePlaceAssociation {
    if (this.placeAssociations.some((association) => association.placeId === placeId && association.relationType === relationType)) {
      throw invalidOperation("This recipe-place association already exists.");
    }
    if (isPrimary && this.placeAssociations.some((association) => association.isPrimary)) {
      throw invalidOperation("A recipe can have only one primary place association.");
    }
    const association = RecipePlaceAssociation.create(this.id, placeId, relationType, isPrimary);
    this.placeAssociations.push(association);
    return association;
  }

  addMedia(mediaAssetId: string, position: number, isPrimary = false): RecipeMediaAssociation {
    if (this.mediaAssociations.some((association) => association.mediaAssetId === mediaAssetId)) {
      throw invalidOperation("This media asset is already associated with the recipe.");
    }
    if (this.mediaAssociations.some((association) => association.position === position)) {
      throw invalidOperation("A recipe cannot contain two media assets at the same position.");
    }
    if (isPrimary && this.mediaAssociations.some((association) => association.isPrimary)) {
      throw invalidOperation("A recipe can have only one primary media asset.");
    }
    const association = RecipeMediaAssociation.create(this.id, mediaAssetId, position, isPrimary);
    this.mediaAssociations.push(association);
    return association;
  }

  replacePrimaryMedia(mediaAssetId: string): RecipeMediaAssociation {
    if (mediaAssetId === EMPTY_GUID) throw argumentException("Media asset ID is required.", "mediaAssetId");
    const existing = singleOrDefault(this.mediaAssociations, (association) => association.mediaAssetId === mediaAssetId);
    if (existing !== undefined) {
      if (!existing.isPrimary) throw invalidOperation("An existing secondary media asset cannot be promoted implicitly.");
      return existing;
    }
    const current = singleOrDefault(this.mediaAssociations, (association) => association.isPrimary);
    const position = current?.position ?? 1;
    if (current !== undefined) {
      this.mediaAssociations.splice(this.mediaAssociations.indexOf(current), 1);
      if (!current.isNew) this.removedMediaAssociations.push(current);
    }
    const replacement = RecipeMediaAssociation.create(this.id, mediaAssetId, position, true);
    this.mediaAssociations.push(replacement);
    return replacement;
  }

  publish(versionId: string, publishedAt: Instant): void {
    if (this.status !== "Draft" || this.currentVersionId !== null || this.publishedAt !== null) {
      throw invalidOperation("Only an unpublished Draft recipe can enter this publication workflow.");
    }
    const version = singleOrDefault(this.versions, (candidate) => candidate.id === versionId);
    if (version === undefined) throw invalidOperation("Only a version belonging to this recipe can be published.");
    if (version.translations.length === 0 || version.ingredients.length === 0 || version.steps.length === 0 || version.sources.length === 0) {
      throw invalidOperation("A published recipe version requires translation, ingredient, step, and source records.");
    }
    if (version.translations.some((translation) => translation.isMachineTranslated)) {
      throw invalidOperation("Machine-translated recipe text cannot be published without review.");
    }
    if (isDefaultInstant(publishedAt) || compareInstants(publishedAt, this.createdAt) < 0) {
      throw argumentOutOfRangeException("publishedAt", "Publication time cannot precede creation.");
    }
    this.currentVersionId = version.id;
    this.status = "Published";
    this.publishedAt = publishedAt;
    this.updatedAt = publishedAt;
    this.modified = true;
  }

  publishRevision(versionId: string, revisedAt: Instant): void {
    if (this.status !== "Published" || this.currentVersionId === null || this.publishedAt === null) {
      throw invalidOperation("Only a published recipe can receive a published revision.");
    }
    const version = singleOrDefault(this.versions, (candidate) => candidate.id === versionId);
    if (version === undefined) throw invalidOperation("Only a version belonging to this recipe can become current.");
    if (version.translations.length === 0 || version.ingredients.length === 0 || version.steps.length === 0 || version.sources.length === 0) {
      throw invalidOperation("A published recipe revision requires translation, ingredient, step, and source records.");
    }
    if (version.translations.some((translation) => translation.isMachineTranslated)) {
      throw invalidOperation("Machine-translated recipe text cannot become current without review.");
    }
    if (
      isDefaultInstant(revisedAt) ||
      compareInstants(revisedAt, this.publishedAt) < 0 ||
      compareInstants(revisedAt, this.updatedAt) < 0
    ) {
      throw argumentOutOfRangeException("revisedAt", "Revision time cannot precede publication or the current update.");
    }
    this.currentVersionId = version.id;
    this.updatedAt = revisedAt;
    this.modified = true;
  }
}

/** Enumerable.SingleOrDefault(predicate): more than one match throws. */
export function singleOrDefault<T>(items: readonly T[], predicate: (item: T) => boolean): T | undefined {
  const matches = items.filter(predicate);
  if (matches.length > 1) throw invalidOperation("Sequence contains more than one matching element");
  return matches[0];
}
