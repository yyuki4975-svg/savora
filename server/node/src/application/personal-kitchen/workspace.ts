import { objectInput } from "../identity/identity";
import { ProductError } from "../../domain/product-error";
import { kitchenSlug, kitchenWrite, revisionInput } from "./kitchen";
import type { KitchenWrite } from "../../contracts/kitchen";
export const WORKSPACE = Symbol("KitchenWorkspaceStore");
export interface KitchenWorkspace {
  mealPlan: Record<string, string>; groceryChecked: string[]; pantry: string[];
  collections: { name: string; recipes: string[] }[];
  cookSessions: { recipeSlug: string; step: number; completed: boolean }[];
}
export const emptyWorkspace = (): KitchenWorkspace => ({ mealPlan: {}, groceryChecked: [], pantry: [], collections: [], cookSessions: [] });
export interface WorkspaceResponse { content: KitchenWorkspace; revision: number }
export interface KitchenImportItem { recipeSlug: string; status: KitchenWrite["status"]; privateNote: string | null; servings: number }
export interface WorkspaceStore {
  load(actor: string): Promise<WorkspaceResponse>;
  save(actor: string, content: KitchenWorkspace, revision: number, key: string): Promise<WorkspaceResponse>;
  import(actor: string, items: KitchenImportItem[], apply: boolean, key: string): Promise<{ items: { recipeSlug: string; decision: "Create" | "KeepServer" | "Unavailable" }[] }>;
}
const bad = () => new ProductError(422, "InvalidWorkspace", "Check kitchen fields and size limits.");
function label(value: unknown, max = 160): string {
  if (typeof value !== "string" || !value.trim() || value.length > max || /[\x00-\x1f\x7f]/.test(value)) throw bad();
  return value.trim();
}
function list(value: unknown, max: number, parse: (v: unknown) => string): string[] {
  if (!Array.isArray(value) || value.length > max) throw bad();
  const result = value.map(v => parse(v));
  if (new Set(result).size !== result.length) throw bad();
  return result;
}
export function workspaceContent(value: unknown): KitchenWorkspace {
  const input = objectInput(value, ["mealPlan", "groceryChecked", "pantry", "collections", "cookSessions"]);
  if (!input.mealPlan || typeof input.mealPlan !== "object" || Array.isArray(input.mealPlan)) throw bad();
  const mealPlan: Record<string, string> = {};
  for (const [slot, slug] of Object.entries(input.mealPlan)) {
    if (!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)-(Breakfast|Lunch|Dinner)$/.test(slot)) throw bad();
    mealPlan[slot] = kitchenSlug(slug);
  }
  if (!Array.isArray(input.collections) || input.collections.length > 20 || !Array.isArray(input.cookSessions) || input.cookSessions.length > 50) throw bad();
  const collections = input.collections.map(v => { const row = objectInput(v, ["name", "recipes"]); return { name: label(row.name, 80), recipes: list(row.recipes, 100, kitchenSlug) }; });
  if (new Set(collections.map(c => c.name)).size !== collections.length) throw bad();
  const cookSessions = input.cookSessions.map(v => {
    const row = objectInput(v, ["recipeSlug", "step", "completed"]);
    if (typeof row.step !== "number" || !Number.isInteger(row.step) || row.step < 0 || row.step > 100 || typeof row.completed !== "boolean") throw bad();
    return { recipeSlug: kitchenSlug(row.recipeSlug), step: row.step, completed: row.completed };
  });
  if (new Set(cookSessions.map(s => s.recipeSlug)).size !== cookSessions.length) throw bad();
  const result = { mealPlan, collections, cookSessions, groceryChecked: list(input.groceryChecked, 300, label), pantry: list(input.pantry, 100, label) };
  if (Buffer.byteLength(JSON.stringify(result)) > 20000) throw bad();
  return result;
}
export function workspaceWrite(value: unknown) {
  const row = objectInput(value, ["content", "expectedRevision"]);
  return { content: workspaceContent(row.content), revision: revisionInput(row.expectedRevision, true) };
}
export function importItems(value: unknown): KitchenImportItem[] {
  const input = objectInput(value, ["items"]);
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) throw bad();
  const items = input.items.map(v => {
    const row = objectInput(v, ["recipeSlug", "status", "privateNote", "servings"]);
    const recipeSlug = kitchenSlug(row.recipeSlug), write = kitchenWrite({ status: row.status, privateNote: row.privateNote, servings: row.servings, expectedRevision: 0 });
    return { recipeSlug, status: write.status, privateNote: write.privateNote, servings: write.servings };
  });
  if (new Set(items.map(i => i.recipeSlug)).size !== items.length || Buffer.byteLength(JSON.stringify(items)) > 20000) throw bad();
  return items;
}
