import { objectInput } from "../identity/identity";
import { ProductError } from "../../domain/product-error";
import { kitchenSlug } from "../personal-kitchen/kitchen";
export const COMMUNITY = Symbol("CommunityStore");
export const communitySpaces = ["The shared table", "Technique exchange", "Family recipe circle", "Cookbook club"] as const;
export type CommunitySpace = typeof communitySpaces[number];
export interface CommunityPost {
  id: string; author: string; space: CommunitySpace; text: string; recipeSlug: string | null;
  createdAt: string; helpful: number; replyCount: number; mine: boolean; liked: boolean; saved: boolean;
}
export interface CommunityReply { id: string; author: string; text: string; createdAt: string; mine: boolean }
export interface CommunityInput { space: CommunitySpace; text: string; recipeSlug: string | null }
export interface CommunityReport { id: string; postId: string; reason: string; createdAt: string; post: {author: string; text: string; space: CommunitySpace; hidden: boolean} }
export interface CommunityStore {
  feed(actor: string | null, filter: CommunityFilter, after: string | null, limit: number, saved: boolean): Promise<{ items: CommunityPost[]; nextCursor: string | null }>;
  create(actor: string, input: CommunityInput, key: string): Promise<CommunityPost>;
  replies(actor: string | null, id: string, after: string | null, limit: number): Promise<{ items: CommunityReply[]; nextCursor: string | null }>;
  reply(actor: string, id: string, text: string, key: string): Promise<CommunityReply>;
  mark(actor: string, id: string, kind: "Helpful" | "Saved", active: boolean, key: string): Promise<{ active: boolean }>;
  report(actor: string, id: string, reason: string, key: string): Promise<{ accepted: true }>;
  remove(actor: string, id: string, key: string): Promise<{ removed: true }>;
  reports(actor: string, after: string | null, limit: number): Promise<{ items: CommunityReport[]; nextCursor: string | null }>;
  moderate(actor: string, id: string, action: "hide" | "dismiss", reason: string, key: string): Promise<{ resolved: true }>;
}
export function communityText(value: unknown, maximum = 4000): string {
  if (typeof value !== "string" || !value.trim() || value.length > maximum || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value))
    throw new ProductError(422, "InvalidCommunity", "Check the note and its length.");
  return value.trim();
}
export function communitySpace(value: unknown): CommunitySpace {
  if (!communitySpaces.includes(value as CommunitySpace)) throw new ProductError(422, "InvalidCommunity", "Choose a community space.");
  return value as CommunitySpace;
}
// A feed is one space, or (for a recipe page) every space's notes about one published recipe.
export interface CommunityFilter { space: CommunitySpace | null; recipeSlug: string | null }
export function communityFilter(space: unknown, recipe: unknown): CommunityFilter {
  if (recipe === undefined) return { space: communitySpace(space ?? "The shared table"), recipeSlug: null };
  return { space: space === undefined ? null : communitySpace(space), recipeSlug: kitchenSlug(recipe) };
}
export function communityInput(value: unknown): CommunityInput {
  const input = objectInput(value, ["space", "text", "recipeSlug"]);
  return { space: communitySpace(input.space), text: communityText(input.text), recipeSlug: input.recipeSlug === null ? null : kitchenSlug(input.recipeSlug) };
}
export function communityId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[47][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
    throw new ProductError(422, "InvalidCommunity", "Invalid conversation reference.");
  return value.toLowerCase();
}
