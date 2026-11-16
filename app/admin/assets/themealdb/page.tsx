import type { Metadata } from "next";
import source from "../../../../scripts/data/themealdb-recipes.v1.json";
import { Footer, Header } from "../../../ui";
import { TheMealDbReviewWorkspace, type TheMealDbReviewRecord } from "./themealdb-review-workspace";

export const metadata: Metadata = {
  title: "TheMealDB image review",
  description: "Local visual-fit review for rights-pending TheMealDB recipe images.",
  robots: { index: false, follow: false },
};

type SnapshotMeal = {
  id: string;
  title: string;
  category: string | null;
  area: string | null;
  imageUrl: string;
  ingredients: Array<{ name: string; measure: string | null }>;
};

function checkedText(value: unknown, label: string, maximumLength: number, nullable = false) {
  if ((value === null || value === undefined) && nullable) return null;
  if (typeof value !== "string" || !value.trim() || value.length > maximumLength) {
    throw new Error(`Invalid ${label} in the local TheMealDB snapshot.`);
  }
  return value.trim();
}

function checkedImageUrl(value: unknown, recipeId: string) {
  const text = checkedText(value, `${recipeId}.imageUrl`, 2048);
  const url = new URL(text!);
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.hostname !== "www.themealdb.com"
    || !url.pathname.startsWith("/images/media/meals/")
    || !/\.(?:jpe?g|png|webp)$/iu.test(url.pathname)
    || url.search
    || url.hash
  ) {
    throw new Error(`Unsafe image URL for TheMealDB meal '${recipeId}'.`);
  }
  return url.href;
}

function recipeSlug(title: string, id: string) {
  const words = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80)
    .replace(/-+$/gu, "");
  return `themealdb-${id}-${words || "recipe"}`;
}

function loadRecords(): TheMealDbReviewRecord[] {
  if (
    source.schemaVersion !== 1
    || source.seedId !== "themealdb-recipes-v1"
    || !Array.isArray(source.recipes)
    || source.recipes.length === 0
    || source.recipes.length > 1000
  ) {
    throw new Error("Unsupported local TheMealDB snapshot.");
  }

  const ids = new Set<string>();
  return (source.recipes as SnapshotMeal[]).map((recipe) => {
    const id = checkedText(recipe.id, "recipe ID", 32)!;
    if (!/^\d+$/u.test(id) || ids.has(id)) throw new Error(`Invalid or duplicate TheMealDB meal ID '${id}'.`);
    ids.add(id);
    const title = checkedText(recipe.title, `${id}.title`, 240)!;
    if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0 || recipe.ingredients.length > 20) {
      throw new Error(`Invalid ingredient list for TheMealDB meal '${id}'.`);
    }

    return {
      recipeId: id,
      recipeSlug: recipeSlug(title, id),
      recipeTitle: title,
      category: checkedText(recipe.category, `${id}.category`, 120, true),
      area: checkedText(recipe.area, `${id}.area`, 120, true),
      imageUrl: checkedImageUrl(recipe.imageUrl, id),
      sourceUrl: `https://www.themealdb.com/meal/${id}`,
      ingredients: recipe.ingredients.map((ingredient, index) => ({
        name: checkedText(ingredient.name, `${id}.ingredient.${index}.name`, 240)!,
        measure: checkedText(ingredient.measure, `${id}.ingredient.${index}.measure`, 240, true),
      })),
    };
  });
}

export default function TheMealDbImageReviewPage() {
  return <main>
    <Header />
    <TheMealDbReviewWorkspace
      batchId="themealdb-images-v1"
      sourceRevision={source.sourceRevision}
      records={loadRecords()}
    />
    <Footer />
  </main>;
}
