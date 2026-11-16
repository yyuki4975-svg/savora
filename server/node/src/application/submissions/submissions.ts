import { ProductError } from "../../domain/product-error";
import type { SubmissionContent, SubmissionEvent, SubmissionResponse, SubmissionState } from "../../contracts/submissions";
import { objectInput } from "../identity/identity";
export const SUBMISSIONS = Symbol("SubmissionStore");
export type ReviewAction = "claim" | "request-changes" | "approve" | "reject";
export interface SubmissionStore {
  list(actor: string, review: boolean, after: string | null, limit: number): Promise<{ items: SubmissionResponse[]; nextCursor: string | null }>;
  detail(actor: string, id: string, review: boolean): Promise<{ submission: SubmissionResponse; events: SubmissionEvent[] }>;
  create(actor: string, content: SubmissionContent, key: string): Promise<SubmissionResponse>;
  edit(actor: string, id: string, content: SubmissionContent, revision: number, key: string): Promise<SubmissionResponse>;
  submit(actor: string, id: string, revision: number, key: string): Promise<SubmissionResponse>;
  review(actor: string, id: string, action: ReviewAction, reason: string | null, revision: number, key: string): Promise<SubmissionResponse>;
}
function invalid(): never { throw new ProductError(422, "InvalidSubmission", "Check the recipe fields and their size limits."); }
function text(value: unknown, max: number, empty = false): string {
  if (typeof value !== "string" || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value)) invalid();
  const result = value.trim(); if (!empty && !result) invalid(); return result;
}
export function submissionId(value: unknown): string {
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) invalid();
  return value.toLowerCase();
}
export function submissionRevision(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value >= 2147483647) invalid();
  return value;
}
export function submissionContent(value: unknown): SubmissionContent {
  const input = objectInput(value, ["title", "locale", "place", "story", "servings", "ingredients", "steps", "sources", "rightsConfirmed", "details"]);
  const title = text(input.title, 160), locale = text(input.locale, 16);
  if (!/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})?$/.test(locale)) invalid();
  if (typeof input.servings !== "number" || !Number.isInteger(input.servings) || input.servings < 1 || input.servings > 100) invalid();
  if (typeof input.rightsConfirmed !== "boolean") invalid();
  if (!Array.isArray(input.ingredients) || input.ingredients.length > 60 || !Array.isArray(input.steps) || input.steps.length > 40 ||
    !Array.isArray(input.sources) || input.sources.length > 8) invalid();
  const ingredients = input.ingredients.map(item => {
    const row = objectInput(item, ["name", "quantity"]);
    return { name: text(row.name, 160), quantity: text(row.quantity, 80) };
  });
  const sources = input.sources.map(value => {
    const source = text(value, 1000); let url: URL;
    try { url = new URL(source); } catch { return invalid(); }
    // Attribution only: never fetched, embedded or rendered as raw HTML by the API.
    if (url.protocol !== "https:" || url.username || url.password) invalid();
    return url.href;
  });
  let details: SubmissionContent['details'];
  if (input.details !== undefined) {
    const fields = objectInput(input.details, ['localName','country','region','city','kind','allergens','dietary','sourcesText']);
    details = {localName:text(fields.localName,160,true),country:text(fields.country,160,true),region:text(fields.region,160,true),city:text(fields.city,160,true),kind:text(fields.kind,160,true),allergens:text(fields.allergens,600,true),dietary:text(fields.dietary,600,true),sourcesText:text(fields.sourcesText,4000,true)};
  }
  const result: SubmissionContent = { title, locale, place: text(input.place, 160, true), story: text(input.story, 4000, true),
    servings: input.servings, rightsConfirmed: input.rightsConfirmed, ingredients,
    steps: input.steps.map(value => text(value, 1500)), sources, ...(details ? {details} : {}) };
  if (JSON.stringify(result).length > 18000) invalid();
  return result;
}
export function requireReady(content: SubmissionContent): void {
  // The story is optional: a recipe can be submitted with place, ingredients, method and rights alone.
  if (!content.place || !content.ingredients.length || !content.steps.length || !content.rightsConfirmed) {
    throw new ProductError(422, "IncompleteSubmission", "Add place, ingredients, method and the rights declaration before submitting.");
  }
}
export function reviewInput(value: unknown): { action: ReviewAction; reason: string | null; expectedRevision: number } {
  const input = objectInput(value, ["action", "reason", "expectedRevision"]);
  if (typeof input.action !== "string" || !["claim", "request-changes", "approve", "reject"].includes(input.action)) invalid();
  const reason = input.reason === null ? null : text(input.reason, 2000);
  if (input.action !== "claim" && !reason) invalid();
  return { action: input.action as ReviewAction, reason, expectedRevision: submissionRevision(input.expectedRevision) };
}
export function reviewTarget(state: SubmissionState, action: ReviewAction): SubmissionState {
  if (action === "claim" && state === "Submitted") return "InReview";
  if (state === "InReview") {
    if (action === "request-changes") return "NeedsChanges";
    if (action === "approve") return "Approved";
    if (action === "reject") return "Rejected";
  }
  throw new ProductError(409, "InvalidTransition", "This review action is not available in the current state.");
}
