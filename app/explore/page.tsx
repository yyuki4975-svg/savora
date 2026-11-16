import type { Metadata } from "next";
import { ExploreExperience, type ExploreQuery } from "./explore-experience";

export const metadata: Metadata = {
  title: "Explore food culture",
  description: "Explore Savora's published recipes by ingredient and place, then discover the culture behind the dish.",
};

export default async function ExplorePage({ searchParams }: { searchParams: Promise<ExploreQuery> }) {
  // Search, filters, and pagination are URL-addressable server-rendered state.
  // Source: https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional
  return <ExploreExperience query={await searchParams} basePath="/explore" storyPath="/stories/paella-valenciana" />;
}
