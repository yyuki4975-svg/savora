import type { OperatorRecipeDetailResponse, OperatorRecipeListResponse } from "../../contracts/operator";

/** Ports Savora.Application.Catalog.IOperatorCatalogQueries (Development-only Draft review). */
export interface OperatorCatalogQueries {
  listDraftRecipes(
    locale: string,
    query: string | undefined,
    provider: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<OperatorRecipeListResponse>;
  getDraftRecipe(slug: string, locale: string): Promise<OperatorRecipeDetailResponse | null>;
}

export const OPERATOR_CATALOG_QUERIES = Symbol("OperatorCatalogQueries");
