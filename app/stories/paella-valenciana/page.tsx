import type { Metadata } from "next";
import { PaellaExhibition } from "./story-experience";

export const metadata: Metadata = {
  title: "From wetland to pan — Paella Valenciana",
  description: "Explore the Valencian landscape, ingredients and cooking technique behind Paella Valenciana.",
  robots: { index: false, follow: false },
};

export default function PaellaStoryPage() {
  return <PaellaExhibition />;
}
