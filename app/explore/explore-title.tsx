"use client";
import { useWebsiteCopy } from "../use-website-copy";

// Keep the designed count span, while translating the complete sentence so CJK
// word order is not assembled from disconnected English text nodes.
export function ExploreTitle({ count }: { count: number }) {
  const copy = useWebsiteCopy();
  const parts = copy("Explore {slotA} recipes").split("{slotA}");
  return <h1 id="explore-title" data-website-localized>{parts[0]}<span>{count.toLocaleString("en")}</span>{parts[1]}</h1>;
}
