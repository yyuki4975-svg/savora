import { notFound } from "next/navigation";
import { LocalizedCookMode } from "../../localized-dish-experience";
import { catalogDishes } from "../../product-data";
import { getRecipe, isCatalogApiEnabled } from "../../../lib/api/savora-client";

export default async function CookPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ step?: string }> }) {
  const { slug } = await params; const query = await searchParams;
  const dish = catalogDishes.find((item) => item.slug === slug); if (!dish) notFound();
  if (!isCatalogApiEnabled()) return <main><h1>Recipe temporarily unavailable</h1></main>;
  const result = await getRecipe(slug, "en");
  if (result.status === "not-found") notFound();
  if (result.status !== "ok") return <main><h1>Recipe temporarily unavailable</h1></main>;
  return <LocalizedCookMode dish={dish} english={result.data} initialStep={Number(query.step ?? 0)} />;
}

