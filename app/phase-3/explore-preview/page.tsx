import type { Metadata } from "next";
import { ExploreExperience, type ExploreQuery } from "../../explore/explore-experience";

export const metadata: Metadata = {
  title: "Phase 3 explore preview",
  description: "Explore Savora's published food culture by ingredient and place.",
  robots: { index: false, follow: false },
};

export default async function ExplorePreviewPage({ searchParams }: { searchParams: Promise<ExploreQuery> }) {
  // Next.js 16 supplies page searchParams as a Promise.
  // Source: https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional
  return <ExploreExperience query={await searchParams} basePath="/phase-3/explore-preview" storyPath="/phase-3/story-preview/paella-valenciana" preview />;
}
