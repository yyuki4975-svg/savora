// Preserved v1 local-state import contract. HTTP/auth/persistence are future slices.
export const LOCAL_STATE_IMPORT = { schemaVersion: 1, maximumItems: 500, maximumNoteLength: 4000, maximumBytes: 256 * 1024 } as const;
export interface LocalRecipeStateImportItem {
  recipeSlug: string;
  status: string | null;
  privateNote: string | null;
  updatedAt: string;
}
export interface LocalStateImportPreviewRequest {
  schemaVersion: number;
  migrationId: string;
  exportedAt: string;
  recipes: LocalRecipeStateImportItem[];
}
export interface LocalStateImportPreviewItem {
  recipeSlug: string;
  recipeId: string | null;
  decision: string;
  reason: string | null;
}
export interface LocalStateImportPreviewResponse {
  migrationId: string;
  items: LocalStateImportPreviewItem[];
  createCount: number;
  updateCount: number;
  keepServerCount: number;
  unresolvedCount: number;
}
export interface ApplyLocalStateImportRequest { schemaVersion: number; migrationId: string; previewToken: string }
export interface LocalStateImportReceiptResponse {
  migrationId: string;
  importedAt: string;
  createdCount: number;
  updatedCount: number;
  keptServerCount: number;
  unresolvedCount: number;
  replay: boolean;
}
