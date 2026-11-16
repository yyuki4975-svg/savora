import type {
  PlaceResponse,
  RecipeDetailResponse,
  RecipeDiscoveryListResponse,
  RecipeListResponse,
} from "../../contracts/catalog";

/** Ports Savora.Application.Catalog.ICatalogQueries. */
export interface CatalogQueries {
  listRecipes(locale: string, query: string | undefined, limit: number): Promise<RecipeListResponse>;
  listDiscoveryRecipes(locale: string, query: string | undefined, limit: number, offset?: number): Promise<RecipeDiscoveryListResponse>;
  getRecipe(slug: string, locale: string): Promise<RecipeDetailResponse | null>;
  getPlace(slug: string, locale: string): Promise<PlaceResponse | null>;
}

export const CATALOG_QUERIES = Symbol("CatalogQueries");

/** Readiness probe, the equivalent of the EF DbContext health check. */
export interface DatabaseHealth {
  canConnect(): Promise<boolean>;
}

export const DATABASE_HEALTH = Symbol("DatabaseHealth");
