// Read models loaded by infrastructure. Values are already normalised to their
// contract representation (timestamps as .NET-style ISO strings, numerics as numbers).

export interface RecipeRow {
  id: string;
  slug: string;
  publishedAt: string | null;
  currentVersionId: string | null;
}

export interface RecipeVersionRow {
  id: string;
  versionNumber: number;
  originalLocale: string;
  servings: number;
  preparationMinutes: number | null;
  cookingMinutes: number | null;
}

export interface RecipeTranslationRow {
  id: string;
  recipeVersionId: string;
  locale: string;
  title: string;
  summary: string;
  culturalNote: string | null;
}

export interface IngredientLineRow {
  id: string;
  recipeVersionId: string;
  position: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  preparationNote: string | null;
}

export interface RecipeStepRow {
  id: string;
  recipeVersionId: string;
  position: number;
  title: string | null;
  instruction: string;
  durationMinutes: number | null;
}

export interface SourceAttributionRow {
  id: string;
  recipeVersionId: string;
  sourceUrl: string;
  sourceName: string;
  licenseCode: string;
  retrievedAt: string;
  externalId: string | null;
}

export interface PlaceNameRow {
  id: string;
  placeId: string;
  locale: string;
  name: string;
}

export interface PlaceRow {
  id: string;
  slug: string;
  type: string;
  latitude: number | null;
  longitude: number | null;
  wikidataId: string | null;
  names: PlaceNameRow[];
}

export interface RecipePlaceAssociationRow {
  recipeId: string;
  relationType: string;
  isPrimary: boolean;
  place: PlaceRow;
}

export interface MediaAssetRow {
  id: string;
  storageKey: string | null;
  sourceUrl: string | null;
  contentType: string;
  altText: string;
  creator: string;
  licenseCode: string;
  licenseUrl: string;
  provider: string;
  externalId: string;
  width: number | null;
  height: number | null;
  rightsStatus: string;
}

export interface RecipeMediaAssociationRow {
  recipeId: string;
  isPrimary: boolean;
  media: MediaAssetRow;
}

/** A published recipe with the parts of its current version a query loaded. */
export interface RecipeAggregate {
  recipe: RecipeRow;
  version: RecipeVersionRow | null;
  translations: RecipeTranslationRow[];
  ingredients: IngredientLineRow[];
  steps: RecipeStepRow[];
  sources: SourceAttributionRow[];
  placeAssociations: RecipePlaceAssociationRow[];
  mediaAssociations: RecipeMediaAssociationRow[];
}

// ---- Operator Draft review (EfOperatorCatalogQueries) ----

export interface OperatorRecipeRow {
  id: string;
  slug: string;
  status: string;
  currentVersionId: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** A version with its collections, each in the order the split query returned them. */
export interface OperatorVersionAggregate {
  version: RecipeVersionRow;
  translations: RecipeTranslationRow[];
  ingredients: IngredientLineRow[];
  steps: RecipeStepRow[];
  sources: SourceAttributionRow[];
}

export interface OperatorMediaAssociationRow {
  position: number;
  isPrimary: boolean;
  media: MediaAssetRow;
}

export interface OperatorRecipeAggregate {
  recipe: OperatorRecipeRow;
  versions: OperatorVersionAggregate[];
  /** Loaded with places only for the detail route; the list only needs the count. */
  placeAssociations: RecipePlaceAssociationRow[];
  placeAssociationCount: number;
  mediaAssociations: OperatorMediaAssociationRow[];
}
