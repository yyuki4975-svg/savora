// Serialized DTOs for the Development-only operator Draft routes.
// Field order and nullability mirror Savora.Contracts.Catalog.OperatorRecipeResponses.
import type {
  IngredientLineResponse,
  RecipePlaceAssociationResponse,
  RecipeStepResponse,
  SourceAttributionResponse,
} from "./catalog";

export interface OperatorMediaResponse {
  id: string;
  position: number;
  isPrimary: boolean;
  provider: string;
  externalId: string;
  storageKey: string | null;
  sourceUrl: string | null;
  contentType: string;
  altText: string;
  creator: string;
  licenseCode: string;
  licenseUrl: string;
  width: number | null;
  height: number | null;
  rightsStatus: string;
}

export interface OperatorRecipeSummaryResponse {
  id: string;
  slug: string;
  status: string;
  latestVersion: number | null;
  originalLocale: string | null;
  locale: string | null;
  title: string | null;
  summary: string | null;
  createdAt: string;
  updatedAt: string;
  providers: string[];
  primaryMedia: OperatorMediaResponse | null;
  issues: string[];
}

export interface OperatorRecipeListResponse {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  items: OperatorRecipeSummaryResponse[];
}

export interface OperatorRecipeDetailResponse {
  id: string;
  slug: string;
  status: string;
  currentVersionId: string | null;
  latestVersion: number | null;
  originalLocale: string | null;
  locale: string | null;
  title: string | null;
  summary: string | null;
  culturalNote: string | null;
  servings: number | null;
  preparationMinutes: number | null;
  cookingMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  ingredients: IngredientLineResponse[];
  steps: RecipeStepResponse[];
  sources: SourceAttributionResponse[];
  places: RecipePlaceAssociationResponse[];
  media: OperatorMediaResponse[];
  issues: string[];
}
