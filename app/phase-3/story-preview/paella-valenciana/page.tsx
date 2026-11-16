import type { Metadata } from "next";
import { PaellaExhibition } from "../../../stories/paella-valenciana/story-experience";

export const metadata: Metadata = {
  title: "From wetland to pan — story preview",
  description: "A Savora online exhibition about Paella Valenciana and its landscape.",
  robots: { index: false, follow: false },
};

export default function PaellaStoryPreviewPage() {
  return <PaellaExhibition preview />;
}
