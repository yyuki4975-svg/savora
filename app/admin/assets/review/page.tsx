import type { Metadata } from "next";
import batch01 from "../../../../scripts/data/recipe-media-candidates.nhlbi-b01.json";
import batch02 from "../../../../scripts/data/recipe-media-candidates.nhlbi-b02.json";
import source from "../../../../scripts/data/nih-nhlbi-recipes.v2.json";
import { Footer, Header } from "../../../ui";
import { MediaReviewWorkspace, type MediaReviewRecord } from "./media-review-workspace";

export const metadata: Metadata = {
  title: "Media candidate review",
  description: "Local editorial review workspace for rights-pending recipe media candidates.",
  robots: { index: false, follow: false },
};

const mediaHosts = new Set([
  "commons.wikimedia.org",
  "upload.wikimedia.org",
  "www.flickr.com",
  "live.staticflickr.com",
]);

type ManifestRecord = {
  recipeSlug: string;
  recipeTitle: string;
  status: string;
  searchQuery: string;
  reviewNote?: string;
  confidence?: string;
  matchRationale?: string;
  warnings?: string[];
  asset?: {
    sourceType: string;
    provider: string;
    providerId: string;
    title: string;
    creator: string;
    licenseCode: string;
    licenseUrl: string;
    rightsStatus: string;
    landingPageUrl: string | null;
    originalUrl: string;
    width: number;
    height: number;
    sha256?: string;
    generatedAt?: string;
    generationPromptSummary?: string;
    altTextDraft: string;
  };
};

type CandidateManifest = {
  batchId: string;
  visualReview: {
    acceptedRecipeSlugs: string[];
  };
  records: ManifestRecord[];
};

const reviewBatches = {
  b01: { label: "Batch 01", manifest: batch01 as CandidateManifest },
  b02: { label: "Batch 02", manifest: batch02 as CandidateManifest },
} as const;

type ReviewBatchKey = keyof typeof reviewBatches;

function isReviewBatchKey(value: unknown): value is ReviewBatchKey {
  return typeof value === "string" && Object.hasOwn(reviewBatches, value);
}

function checkedUrl(value: unknown, allowedHosts: Set<string>, label: string) {
  if (typeof value !== "string") throw new Error(`Missing ${label} URL in the local media review manifest.`);
  const url = new URL(value);
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || !allowedHosts.has(url.hostname)
    || url.hash
  ) {
    throw new Error(`Unsafe ${label} URL in the local media review manifest.`);
  }
  return url.href;
}

function checkedGeneratedPath(value: unknown) {
  if (typeof value !== "string" || !/^\/images\/generated\/[a-z0-9-]+-v[0-9]+\.png$/u.test(value)) {
    throw new Error("Unsafe generated image path in the local media review manifest.");
  }
  return value;
}

function ingredientText(ingredient: {
  name: string;
  quantity: number | null;
  unit: string | null;
  preparationNote: string | null;
}) {
  return [
    ingredient.quantity,
    ingredient.unit,
    ingredient.name,
    ingredient.preparationNote ? `— ${ingredient.preparationNote}` : null,
  ].filter((value) => value !== null && value !== "").join(" ");
}

function loadReviewRecords(candidates: CandidateManifest): MediaReviewRecord[] {
  const recipes = new Map(source.recipes.map((recipe) => [recipe.slug, recipe]));
  const visuallyAccepted = new Set(candidates.visualReview.acceptedRecipeSlugs);

  return (candidates.records as ManifestRecord[]).map((record) => {
    const recipe = recipes.get(record.recipeSlug);
    if (!recipe) throw new Error(`Unknown recipe '${record.recipeSlug}' in the media review manifest.`);

    const common = {
      recipeSlug: recipe.slug,
      recipeTitle: recipe.title,
      summary: recipe.summary,
      sourceUrl: checkedUrl(recipe.sourceUrl, new Set(["www.nhlbi.nih.gov"]), "recipe source"),
      servings: recipe.servings,
      preparationMinutes: recipe.preparationMinutes,
      cookingMinutes: recipe.cookingMinutes,
      ingredients: recipe.ingredients.map(ingredientText),
      steps: recipe.steps.map((step) => step.instruction),
      searchQuery: record.searchQuery,
      visualReviewState: visuallyAccepted.has(record.recipeSlug) ? "Accepted" as const : "AwaitingReview" as const,
    };

    if (record.status === "NoSuitableMatch") {
      if (typeof record.reviewNote !== "string" || !record.reviewNote.trim()) {
        throw new Error(`Missing no-match review note for '${record.recipeSlug}'.`);
      }
      return {
        ...common,
        status: "NoSuitableMatch" as const,
        reviewNote: record.reviewNote,
        candidate: null,
      };
    }

    if (
      record.status !== "Candidate"
      || !record.asset
      || typeof record.confidence !== "string"
      || typeof record.matchRationale !== "string"
      || !Array.isArray(record.warnings)
    ) {
      throw new Error(`Invalid candidate state for '${record.recipeSlug}'.`);
    }

    const sourceType = record.asset.sourceType;
    if (sourceType !== "External" && sourceType !== "Generated") {
      throw new Error(`Invalid source type for '${record.recipeSlug}'.`);
    }

    const landingPageUrl = sourceType === "Generated"
      ? null
      : checkedUrl(record.asset.landingPageUrl, mediaHosts, "source page");
    const originalUrl = sourceType === "Generated"
      ? checkedGeneratedPath(record.asset.originalUrl)
      : checkedUrl(record.asset.originalUrl, mediaHosts, "original image");

    if (
      sourceType === "Generated"
      && (
        record.asset.provider !== "ChatGPT Work image generation"
        || record.asset.landingPageUrl !== null
        || !record.warnings.includes("AI_GENERATED")
        || !record.asset.sha256?.match(/^[0-9a-f]{64}$/u)
        || Number.isNaN(Date.parse(record.asset.generatedAt ?? ""))
        || !record.asset.generationPromptSummary?.trim()
      )
    ) {
      throw new Error(`Invalid generation provenance for '${record.recipeSlug}'.`);
    }

    return {
      ...common,
      status: "Candidate" as const,
      confidence: record.confidence,
      matchRationale: record.matchRationale,
      warnings: record.warnings,
      candidate: {
        sourceType,
        title: record.asset.title,
        provider: record.asset.provider,
        providerId: record.asset.providerId,
        creator: record.asset.creator,
        licenseCode: record.asset.licenseCode,
        rightsStatus: "Pending" as const,
        licenseUrl: checkedUrl(record.asset.licenseUrl, new Set(["creativecommons.org", "openai.com"]), "license"),
        landingPageUrl,
        originalUrl,
        width: record.asset.width,
        height: record.asset.height,
        sha256: sourceType === "Generated" ? record.asset.sha256 ?? null : null,
        generatedAt: sourceType === "Generated" ? record.asset.generatedAt ?? null : null,
        generationPromptSummary: sourceType === "Generated" ? record.asset.generationPromptSummary ?? null : null,
        altTextDraft: record.asset.altTextDraft,
      },
    };
  });
}

export default async function MediaReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ batch?: string | string[] }>;
}) {
  const requestedBatch = (await searchParams).batch;
  const batchKey: ReviewBatchKey = isReviewBatchKey(requestedBatch) ? requestedBatch : "b02";
  const activeBatch = reviewBatches[batchKey];

  return (
    <main>
      <Header />
      <MediaReviewWorkspace
        key={activeBatch.manifest.batchId}
        batchId={activeBatch.manifest.batchId}
        batchLabel={activeBatch.label}
        batchLinks={Object.entries(reviewBatches).map(([key, batch]) => ({
          href: `/admin/assets/review?batch=${key}`,
          label: batch.label,
          active: key === batchKey,
        }))}
        records={loadReviewRecords(activeBatch.manifest)}
      />
      <Footer />
    </main>
  );
}
