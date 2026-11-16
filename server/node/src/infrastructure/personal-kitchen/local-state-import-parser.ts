import type { ParsedLocalRecipeState, ParsedLocalStateImport } from "../../application/personal-kitchen/local-state-import";
import { LOCAL_STATE_IMPORT } from "../../contracts/personal-kitchen";
import type { Instant } from "../../domain/dotnet/instant";
import { invalidData } from "../../domain/dotnet/errors";
import { deserialize, record, int, guid, dto, list, string } from "../dotnet/stj";

const item = record("Savora.Contracts.PersonalKitchen.LocalRecipeStateImportItem", [
  ["RecipeSlug", string], ["Status", string], ["PrivateNote", string], ["UpdatedAt", dto],
]);
const envelope = record("Savora.Contracts.PersonalKitchen.LocalStateImportPreviewRequest", [
  ["SchemaVersion", int], ["MigrationId", guid], ["ExportedAt", dto], ["Recipes", list(item)],
]);
export function parseLocalStateImportEnvelope(bytes: Uint8Array): ParsedLocalStateImport {
  if (bytes.byteLength > LOCAL_STATE_IMPORT.maximumBytes) throw invalidData("Local-state import exceeds 262144 bytes.");
  const value = deserialize(bytes, envelope, { caseInsensitive: true });
  if (!value) throw invalidData("Local-state import must be an object.");
  const recipes = value.Recipes as Array<Record<string, unknown>> | null;
  return {
    schemaVersion: value.SchemaVersion as number, migrationId: value.MigrationId as string,
    exportedAt: value.ExportedAt as Instant,
    recipes: recipes?.map(row => {
      if (!row) throw invalidData("Recipe items must be objects.");
      return { recipeSlug: row.RecipeSlug, status: row.Status, privateNote: row.PrivateNote, updatedAt: row.UpdatedAt } as ParsedLocalRecipeState;
    }) ?? null,
  };
}
