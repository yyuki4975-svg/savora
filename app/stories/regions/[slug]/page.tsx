import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPublishedDiscoveryCatalog } from "../../../../lib/api/published-discovery";
import { getRegionalFoodExhibition, regionalFoodExhibitions } from "../../../../lib/editorial/regional-food-exhibitions";
import { getRegionalLongformExhibition } from "../../../../lib/editorial/regional-longform-exhibitions";
import { RegionalLongformExhibitionPage } from "./regional-longform-exhibition";
import { SpainExhibition } from "./spain-exhibition";

export function generateStaticParams() {
  return regionalFoodExhibitions.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const exhibition = getRegionalFoodExhibition((await params).slug);
  return exhibition ? { title: exhibition.title, description: exhibition.introduction } : {};
}

export default async function RegionalFoodStory({ params }: { params: Promise<{ slug: string }> }) {
  const exhibition = getRegionalFoodExhibition((await params).slug);
  if (!exhibition) notFound();

  const catalog = await loadPublishedDiscoveryCatalog();
  const recipes = catalog.status === "ok" ? catalog.recipes : [];
  const countryMatches = recipes.filter((recipe) => recipe.country === exhibition.country);
  // A shared ingredient does not establish geographic origin. No cross-country fallback.
  const matches = countryMatches;

  if (exhibition.slug === "spain") return <SpainExhibition recipes={matches} />;

  const longform = getRegionalLongformExhibition(exhibition.slug);
  if (!longform) notFound();
  return <RegionalLongformExhibitionPage exhibition={longform} recipes={matches} />;
}
