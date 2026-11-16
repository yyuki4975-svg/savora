// Serialized DTOs for the v1 public catalog. Field order and nullability mirror
// the accepted contract at server/node/openapi/savora-v1.json.

export interface PlaceResponse {
  id: string;
  slug: string;
  type: string;
  locale: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  wikidataId: string | null;
}

export interface SourceAttributionResponse {
  sourceUrl: string;
  sourceName: string;
  licenseCode: string;
  retrievedAt: string;
  externalId: string | null;
}

export interface RecipePlaceAssociationResponse {
  place: PlaceResponse;
  relationType: string;
  isPrimary: boolean;
}

export interface RecipeMediaResponse {
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
}

export interface IngredientLineResponse {
  position: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  preparationNote: string | null;
}

export interface RecipeStepResponse {
  position: number;
  title: string | null;
  instruction: string;
  durationMinutes: number | null;
}

export interface RecipeSummaryResponse {
  id: string;
  slug: string;
  locale: string;
  title: string;
  summary: string;
  servings: number;
  preparationMinutes: number | null;
  cookingMinutes: number | null;
  publishedAt: string | null;
}

export interface RecipeListResponse {
  items: RecipeSummaryResponse[];
}

export interface RecipeDiscoverySummaryResponse {
  id: string;
  slug: string;
  locale: string;
  title: string;
  summary: string;
  culturalNote: string | null;
  preparationMinutes: number | null;
  cookingMinutes: number | null;
  publishedAt: string | null;
  ingredients: string[];
  source: SourceAttributionResponse | null;
  places: RecipePlaceAssociationResponse[];
  primaryMedia: RecipeMediaResponse | null;
}

export interface RecipeDiscoveryListResponse {
  items: RecipeDiscoverySummaryResponse[];
}

export interface RecipeDetailResponse {
  id: string;
  slug: string;
  locale: string;
  title: string;
  summary: string;
  culturalNote: string | null;
  version: number;
  servings: number;
  preparationMinutes: number | null;
  cookingMinutes: number | null;
  publishedAt: string | null;
  ingredients: IngredientLineResponse[];
  steps: RecipeStepResponse[];
  sources: SourceAttributionResponse[];
  places: RecipePlaceAssociationResponse[];
  primaryMedia: RecipeMediaResponse | null;
}
