import { LOCAL_STATE_IMPORT, type LocalRecipeStateImportItem, type LocalStateImportPreviewRequest } from "../../contracts/personal-kitchen";
import { type Instant, isDefaultInstant } from "../../domain/dotnet/instant";
import { EMPTY_GUID } from "../../domain/dotnet/guid";
import { dotnetTrim, SLUG_PATTERN } from "../../domain/text";

export interface ParsedLocalRecipeState extends Omit<LocalRecipeStateImportItem, "updatedAt"> { updatedAt: Instant }
export interface ParsedLocalStateImport extends Omit<LocalStateImportPreviewRequest, "exportedAt" | "recipes"> {
  exportedAt: Instant;
  recipes: ParsedLocalRecipeState[] | null;
}

/** Preserves the accepted application rules without introducing a write HTTP endpoint. */
export function validateLocalStateImportEnvelope(request: ParsedLocalStateImport, now: Instant) {
  const errors: Record<string, string[]> = {};
  const add = (condition: boolean, key: string, message: string) => { if (condition) (errors[key] ??= []).push(message); };
  const future = now.utcTicks + 5n * 60n * 10_000_000n;
  const invalidTime = (value: Instant) => isDefaultInstant(value) || value.utcTicks > future;
  add(request.schemaVersion !== LOCAL_STATE_IMPORT.schemaVersion, "schemaVersion", "Schema version must be 1.");
  add(request.migrationId === EMPTY_GUID, "migrationId", "Migration ID is required.");
  add(invalidTime(request.exportedAt), "exportedAt", "Export time is required and cannot be in the future.");
  const items = request.recipes;
  add(!items || items.length < 1 || items.length > LOCAL_STATE_IMPORT.maximumItems, "recipes", "Recipes must contain between 1 and 500 items.");
  if (items) {
    const slugs = new Set<string>();
    const statuses = new Set(["Want to cook", "Cooking", "Cooked", "Favorite"]);
    let bytes = 128;
    items.forEach((item, index) => {
      const prefix = `recipes[${index}]`;
      const slug = dotnetTrim(item.recipeSlug ?? "");
      const note = item.privateNote == null ? null : dotnetTrim(item.privateNote);
      add(!SLUG_PATTERN.test(slug), `${prefix}.recipeSlug`, "Recipe slug must be a canonical lowercase slug.");
      add(slug !== "" && slugs.has(slug), `${prefix}.recipeSlug`, "Each recipe slug may appear only once.");
      if (slug) slugs.add(slug);
      add(item.status !== null && !statuses.has(item.status), `${prefix}.status`, "Status is not supported.");
      add(item.privateNote !== null && (!note || note.length > LOCAL_STATE_IMPORT.maximumNoteLength), `${prefix}.privateNote`,
        "Private note must contain 1 to 4000 characters when supplied.");
      add(item.status === null && item.privateNote === null, prefix, "A recipe item must contain a status, a private note, or both.");
      add(invalidTime(item.updatedAt), `${prefix}.updatedAt`, "Update time is required and cannot be in the future.");
      bytes += Buffer.byteLength(slug) + Buffer.byteLength(item.status ?? "") + Buffer.byteLength(item.privateNote ?? "") + 96;
    });
    add(bytes > LOCAL_STATE_IMPORT.maximumBytes, "recipes", "Estimated envelope size must not exceed 262144 bytes.");
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}
