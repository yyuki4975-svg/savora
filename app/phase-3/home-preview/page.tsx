import type { Metadata } from "next";
import { HomeExperience } from "../../home-experience";

export const metadata: Metadata = {
  title: "Phase 3 homepage preview",
  description: "An editorial homepage built from Savora's published recipe catalog.",
  robots: { index: false, follow: false },
};

export default function HomePreviewPage() {
  return <HomeExperience preview />;
}
