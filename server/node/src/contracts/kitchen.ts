export type KitchenStatus = "Want to cook" | "Cooking" | "Cooked" | "Favorite";
export interface KitchenWrite {
  status: KitchenStatus | null; privateNote: string | null; servings: number; expectedRevision: number;
}
export interface KitchenEntryResponse {
  recipeSlug: string; status: KitchenStatus | null; privateNote: string | null;
  servings: number; revision: number; updatedAt: string;
}
