import type { KitchenWrite, KitchenEntryResponse, KitchenStatus } from "../../contracts/kitchen";
import { ProductError } from "../../domain/product-error";
import { objectInput } from "../identity/identity";
export const KITCHEN = Symbol("KitchenStore");
export interface KitchenStore {
  list(accountId: string, after: string | null, limit: number): Promise<{ items: KitchenEntryResponse[]; nextCursor: string | null }>;
  save(accountId: string, slug: string, write: KitchenWrite, key: string): Promise<KitchenEntryResponse>;
  remove(accountId: string, slug: string, expectedRevision: number, key: string): Promise<void>;
}
export function kitchenSlug(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) || value.length > 120) {
    throw new ProductError(422, "InvalidRecipe", "Use a canonical recipe slug.");
  }
  return value;
}
export function revisionInput(value: unknown, allowCreate: boolean): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < (allowCreate ? 0 : 1) || value > 9007199254740990) {
    throw new ProductError(422, "InvalidRevision", "Supply the current revision.");
  }
  return value;
}
export function kitchenWrite(body: unknown): KitchenWrite {
  const input = objectInput(body, ["status", "privateNote", "servings", "expectedRevision"]);
  if (input.status !== null && (typeof input.status !== "string" || !["Want to cook", "Cooking", "Cooked", "Favorite"].includes(input.status))) {
    throw new ProductError(422, "InvalidStatus", "Choose a supported kitchen status.");
  }
  if (input.privateNote !== null && (typeof input.privateNote !== "string" || !input.privateNote.trim() ||
    input.privateNote.length > 4000 || /[\x00\x0b\x0c]/.test(input.privateNote))) {
    throw new ProductError(422, "InvalidNote", "Use a private note of up to 4000 characters.");
  }
  if (input.status === null && input.privateNote === null) throw new ProductError(422, "EmptyEntry", "Choose a status or add a note.");
  if (typeof input.servings !== "number" || !Number.isInteger(input.servings) || input.servings < 1 || input.servings > 100) {
    throw new ProductError(422, "InvalidServings", "Servings must be between 1 and 100.");
  }
  return { status: input.status as KitchenStatus | null, privateNote: input.privateNote as string | null,
    servings: input.servings, expectedRevision: revisionInput(input.expectedRevision, true) };
}
export function idempotencyKey(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(value)) {
    throw new ProductError(422, "IdempotencyKeyRequired", "Supply a unique idempotency key.");
  }
  return value;
}
