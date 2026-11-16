// Port of Savora.Infrastructure.MediaReviews.MediaReviewImporter: stores one immutable review
// import per payload SHA-256 (idempotent), with a decision row per completed editorial decision.
import { count, eq, inArray } from "drizzle-orm";
import { deref, invalidOperation } from "../../../domain/dotnet/errors";
import { MEDIA_REVIEW_DECISION_TYPE, enumName, parseEnum } from "../../../domain/dotnet/enum";
import { utcNow } from "../../../domain/dotnet/instant";
import { MediaReviewImport, type MediaReviewDecisionType } from "../../../domain/model/editorial";
import { mediaReviewDecisions, mediaReviewImports, recipes } from "../../db/schema";
import type { ToolSession } from "../tool-database";
import { UnitOfWork } from "../unit-of-work";
import type { LoadedMediaReviewPackage } from "./media-review-package";

export interface MediaReviewImportResult {
  importId: string;
  added: boolean;
  decisionCount: number;
}

export async function importMediaReview(session: ToolSession, loaded: LoadedMediaReviewPackage): Promise<MediaReviewImportResult> {
  if ((await session.pendingMigrations()).length > 0) {
    throw invalidOperation("Database migrations are pending. Apply and review migrations before importing media reviews.");
  }
  const db = session.db;

  const existing = await db
    .select({
      id: mediaReviewImports.id,
      manifestSha256: mediaReviewImports.manifestSha256,
      decisionCount: db.$count(mediaReviewDecisions, eq(mediaReviewDecisions.reviewImportId, mediaReviewImports.id)),
    })
    .from(mediaReviewImports)
    .where(eq(mediaReviewImports.payloadSha256, loaded.PayloadSha256))
    .limit(2);
  if (existing.length > 1) throw invalidOperation("Sequence contains more than one element");
  const found = existing[0];
  if (found !== undefined) {
    if (found.manifestSha256 !== loaded.ManifestSha256) {
      throw invalidOperation("This review payload was previously imported against a different candidate manifest.");
    }
    return { importId: found.id, added: false, decisionCount: Number(found.decisionCount) };
  }

  const slugs = deref(loaded.Manifest.Records).map((record) => deref(record).RecipeSlug!);
  const recipeRows = slugs.length === 0 ? [] : await db.select({ id: recipes.id, slug: recipes.slug }).from(recipes).where(inArray(recipes.slug, slugs));
  const recipesBySlug = new Map(recipeRows.map((row) => [row.slug, row]));
  const missing = slugs.filter((slug) => !recipesBySlug.has(slug)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  if (missing.length > 0) {
    throw invalidOperation(`The database is missing recipes required by the review package: ${missing.join(", ")}`);
  }

  const reviewImport = MediaReviewImport.create(
    deref(loaded.Review.BatchId),
    loaded.PayloadSha256,
    loaded.ManifestSha256,
    loaded.Review.ExportedAt,
    utcNow(),
  );
  for (const exported of deref(loaded.Review.Decisions)) {
    const decision = deref(exported);
    if (decision.Decision === null) continue;
    const decisionType = enumName(MEDIA_REVIEW_DECISION_TYPE, parseEnum(MEDIA_REVIEW_DECISION_TYPE, decision.Decision)) as MediaReviewDecisionType;
    const checks = deref(decision.Checks);
    reviewImport.addDecision(
      recipesBySlug.get(decision.RecipeSlug!)!.id,
      decision.CandidateProviderId,
      decisionType,
      checks.Recipe,
      checks.Visual,
      checks.Rights,
      checks.Quality,
      decision.Note,
    );
  }

  // SaveChanges without an explicit transaction is itself atomic.
  const unit = new UnitOfWork(session);
  unit.addReviewImport(reviewImport);
  await session.transaction(() => unit.saveChanges());
  return { importId: reviewImport.id, added: true, decisionCount: reviewImport.decisions.length };
}

export { count };
