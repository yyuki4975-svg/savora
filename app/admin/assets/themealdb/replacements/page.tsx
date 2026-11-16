import type { Metadata } from "next";
import batch from "../../../../../scripts/data/themealdb-image-replacements.b01.json";
import results from "../../../../../scripts/data/themealdb-image-generation-results.b01.json";
import { Footer, Header } from "../../../../ui";
import { TheMealDbReviewWorkspace, type TheMealDbReviewRecord } from "../themealdb-review-workspace";

const reviewBatchId = "themealdb-image-replacements-b01-review";

export const metadata: Metadata = {
  title: "Generated recipe image review",
  description: "Local visual review for 21 generated recipe-image replacements.",
  robots: { index: false, follow: false },
};

function checked(value: unknown, label: string, max: number, nullable = false) {
  if ((value === null || value === undefined) && nullable) return null;
  if (typeof value !== "string" || !value.trim() || value.length > max) {
    throw new Error(`Invalid ${label} in the replacement batch.`);
  }
  return value.trim();
}

function loadRecords(): TheMealDbReviewRecord[] {
  if (batch.schemaVersion !== 1 || batch.records.length !== 21
    || results.schemaVersion !== 1 || results.batchId !== batch.batchId
    || results.assets.length !== batch.records.length) {
    throw new Error("Incomplete or unsupported generated-image review batch.");
  }
  const assets = new Map(results.assets.map((asset) => [asset.recipeId, asset]));
  return batch.records.map((record) => {
    const id = checked(record.recipeId, "recipeId", 32)!;
    const asset = assets.get(id);
    if (!asset || asset.recipeTitle !== record.recipeTitle || asset.model !== "gpt-image-2"
      || asset.contentType !== "image/png" || asset.width !== 1448 || asset.height !== 1086
      || !/^[a-f0-9]{64}$/u.test(asset.sha256)
      || !/^\/images\/generated\/themealdb\/[a-z0-9-]+-v1\.png$/u.test(asset.publicPath)
      || asset.publicPath !== record.replacementPath) {
      throw new Error(`Invalid generated asset metadata for recipe '${id}'.`);
    }
    return {
      recipeId: id,
      recipeSlug: checked(record.recipeSlug, `${id}.slug`, 160)!,
      recipeTitle: checked(record.recipeTitle, `${id}.title`, 240)!,
      category: checked(record.category, `${id}.category`, 120, true),
      area: checked(record.area, `${id}.area`, 120, true),
      imageUrl: asset.publicPath,
      imageKind: "Generated",
      sourceUrl: `https://www.themealdb.com/meal/${id}`,
      ingredients: record.ingredients.map((item, index) => ({
        name: checked(item.name, `${id}.ingredient.${index}`, 240)!,
        measure: checked(item.measure, `${id}.measure.${index}`, 240, true),
      })),
    };
  });
}

export default function GeneratedImageReviewPage() {
  return <main>
    <Header />
    <TheMealDbReviewWorkspace batchId={reviewBatchId} sourceRevision={batch.payloadSha256}
      records={loadRecords()} mode="replacement" />
    <Footer />
  </main>;
}
