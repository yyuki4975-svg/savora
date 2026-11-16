import { objectInput } from "../identity/identity";
import { kitchenSlug } from "../personal-kitchen/kitchen";
import { submissionRevision } from "./submissions";
import { ProductError } from "../../domain/product-error";
export const PUBLICATION = Symbol("SubmissionPublicationStore");
export interface PublicationInput { recipeSlug: string; placeSlug: string; mediaAssetId: string; expectedRevision: number; reason: string; checks: Record<string, true> }
export interface PublicationStore {
  publish(actor: string, id: string, input: PublicationInput, key: string): Promise<{ recipeSlug: string; submissionId: string; published: true }>;
  withdraw(actor: string, id: string, revision: number, reason: string, key: string): Promise<{ withdrawn: true }>;
}
export function publicationInput(value: unknown): PublicationInput {
  const row = objectInput(value, ["recipeSlug", "placeSlug", "mediaAssetId", "expectedRevision", "reason", "checks"]);
  const checks = objectInput(row.checks, ["recipeContent", "sourceAttribution", "culturalClaims", "mediaRights", "visualQuality"]);
  if (Object.values(checks).length !== 5 || Object.values(checks).some(v => v !== true) || typeof row.reason !== "string" || !row.reason.trim() || row.reason.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(row.reason))
    throw new ProductError(422, "PublicationChecksRequired", "Complete content, attribution, culture, rights and visual review.");
  // Canonical assets include deterministic UUIDv5 IDs, unlike newly authored community IDs.
  if (typeof row.mediaAssetId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.mediaAssetId))
    throw new ProductError(422, "InvalidMediaAsset", "Select an existing verified media asset.");
  return { recipeSlug: kitchenSlug(row.recipeSlug), placeSlug: kitchenSlug(row.placeSlug), mediaAssetId: row.mediaAssetId.toLowerCase(),
    expectedRevision: submissionRevision(row.expectedRevision), reason: row.reason.trim(), checks: checks as Record<string, true> };
}
