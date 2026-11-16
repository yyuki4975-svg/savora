// Port of Savora.Domain.Editorial (RecipePublicationAudit, MediaReviewImport, MediaReviewDecision).
import { argumentException, argumentOutOfRangeException, invalidOperation } from "../dotnet/errors";
import { EMPTY_GUID, createVersion7 } from "../dotnet/guid";
import { type Instant, compareInstants, isDefaultInstant } from "../dotnet/instant";
import { isNullOrWhiteSpace, requireText } from "../text";

export type MediaReviewDecisionType = "VisuallyAccepted" | "Rejected" | "ConfirmedNoMatch" | "NeedsReplacement";
export const MEDIA_POLICIES = ["VerifiedPrimaryRequired", "OwnerApprovedPrimary", "ReviewedContentMediaOptional"] as const;

const SHA256 = /^[0-9a-f]{64}$/;
const BATCH_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REVIEWER = /^[a-z0-9](?:[a-z0-9._-]{1,118}[a-z0-9])?$/;

export class RecipePublicationAudit {
  constructor(
    readonly id: string,
    readonly recipeId: string,
    readonly recipeVersionId: string,
    readonly basedOnVersion: number,
    readonly payloadSha256: string,
    readonly reviewedBy: string,
    readonly reviewNote: string,
    readonly mediaPolicy: string,
    readonly approvedAt: Instant,
    readonly recordedAt: Instant,
  ) {}

  readonly fromStatus = "Draft";
  readonly toStatus = "Published";

  static create(
    recipeId: string,
    recipeVersionId: string,
    basedOnVersion: number,
    payloadSha256: string,
    reviewedBy: string,
    reviewNote: string,
    mediaPolicy: string,
    approvedAt: Instant,
    recordedAt: Instant,
  ): RecipePublicationAudit {
    if (recipeId === EMPTY_GUID || recipeVersionId === EMPTY_GUID) {
      throw argumentException("Recipe and version IDs are required.");
    }
    if (basedOnVersion < 1) {
      throw argumentOutOfRangeException(
        "basedOnVersion",
        `basedOnVersion ('${basedOnVersion}') must be greater than or equal to '1'.`,
      );
    }
    const normalizedHash = requireText(payloadSha256, 64, "payloadSha256");
    if (!SHA256.test(normalizedHash)) {
      throw argumentException("Payload SHA-256 must be 64 lowercase hexadecimal characters.", "payloadSha256");
    }
    const normalizedReviewer = requireText(reviewedBy, 120, "reviewedBy");
    if (!REVIEWER.test(normalizedReviewer)) {
      throw argumentException(
        "Reviewer ID must contain lowercase ASCII letters, numbers, dots, underscores, or hyphens.",
        "reviewedBy",
      );
    }
    if (!(MEDIA_POLICIES as readonly string[]).includes(mediaPolicy)) {
      throw argumentException("The publication media policy is not supported.", "mediaPolicy");
    }
    if (isDefaultInstant(approvedAt) || isDefaultInstant(recordedAt) || compareInstants(recordedAt, approvedAt) < 0) {
      throw argumentOutOfRangeException("recordedAt", "Audit times are invalid.");
    }
    return new RecipePublicationAudit(
      createVersion7(),
      recipeId,
      recipeVersionId,
      basedOnVersion,
      normalizedHash,
      normalizedReviewer,
      requireText(reviewNote, 2000, "reviewNote"),
      mediaPolicy,
      approvedAt,
      recordedAt,
    );
  }
}

export class MediaReviewDecision {
  constructor(
    readonly reviewImportId: string,
    readonly recipeId: string,
    readonly candidateProviderId: string | null,
    readonly decision: MediaReviewDecisionType,
    readonly recipeChecked: boolean,
    readonly visualChecked: boolean,
    readonly rightsChecked: boolean,
    readonly qualityChecked: boolean,
    readonly note: string | null,
  ) {}
}

function requireSha256(value: string, parameterName: string): string {
  const normalized = requireText(value, 64, parameterName);
  if (!SHA256.test(normalized)) {
    throw argumentException("SHA-256 must contain exactly 64 lowercase hexadecimal characters.", parameterName);
  }
  return normalized;
}

export class MediaReviewImport {
  readonly decisions: MediaReviewDecision[] = [];
  readonly scope = "LocalEditorialReviewOnly";

  constructor(
    readonly id: string,
    readonly batchId: string,
    readonly payloadSha256: string,
    readonly manifestSha256: string,
    readonly exportedAt: Instant,
    readonly importedAt: Instant,
  ) {}

  static create(batchId: string, payloadSha256: string, manifestSha256: string, exportedAt: Instant, importedAt: Instant): MediaReviewImport {
    const normalizedBatchId = requireText(batchId, 120, "batchId");
    if (!BATCH_ID.test(normalizedBatchId)) {
      throw argumentException("Batch ID must contain lowercase ASCII letters, numbers, and single hyphens only.", "batchId");
    }
    if (isDefaultInstant(exportedAt)) throw argumentException("Export time is required.", "exportedAt");
    if (isDefaultInstant(importedAt)) throw argumentException("Import time is required.", "importedAt");
    return new MediaReviewImport(
      createVersion7(),
      normalizedBatchId,
      requireSha256(payloadSha256, "payloadSha256"),
      requireSha256(manifestSha256, "manifestSha256"),
      exportedAt,
      importedAt,
    );
  }

  addDecision(
    recipeId: string,
    candidateProviderId: string | null,
    decision: MediaReviewDecisionType,
    recipeChecked: boolean,
    visualChecked: boolean,
    rightsChecked: boolean,
    qualityChecked: boolean,
    note: string | null,
  ): MediaReviewDecision {
    if (this.decisions.some((item) => item.recipeId === recipeId)) {
      throw invalidOperation("This review import already contains a decision for the recipe.");
    }
    if (this.id === EMPTY_GUID) throw argumentException("Review import ID is required.", "reviewImportId");
    if (recipeId === EMPTY_GUID) throw argumentException("Recipe ID is required.", "recipeId");
    if (!recipeChecked || !visualChecked) throw invalidOperation("Stored decisions require recipe and visual checks.");
    if (decision === "VisuallyAccepted" && (!rightsChecked || !qualityChecked)) {
      throw invalidOperation("Visual acceptance requires rights and quality checks.");
    }
    const normalizedProviderId = isNullOrWhiteSpace(candidateProviderId) ? null : requireText(candidateProviderId, 240, "candidateProviderId");
    if ((decision === "VisuallyAccepted" || decision === "Rejected") && normalizedProviderId === null) {
      throw invalidOperation("Candidate decisions require a provider asset ID.");
    }
    if (decision === "ConfirmedNoMatch" && normalizedProviderId !== null) {
      throw invalidOperation("A confirmed no-match decision cannot reference a candidate asset.");
    }
    const item = new MediaReviewDecision(
      this.id,
      recipeId,
      normalizedProviderId,
      decision,
      recipeChecked,
      visualChecked,
      rightsChecked,
      qualityChecked,
      isNullOrWhiteSpace(note) ? null : requireText(note, 2000, "note"),
    );
    this.decisions.push(item);
    return item;
  }
}
