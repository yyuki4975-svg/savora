import type { Metadata } from "next";
import { loadProfileFeatured } from "../../lib/api/profile-gallery-server";
import { ProfileExperience } from "./profile-experience";

export const metadata: Metadata = {
  title: "Your profile",
  description: "A quiet place for your saved recipes and cooking plans.",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const catalog = await loadProfileFeatured();
  return <ProfileExperience catalog={catalog} />;
}

