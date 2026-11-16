// The profile needs tile fields, not the archive's ingredients, keywords or source prose.
export type ProfileRecipe = {
  slug: string; title: string; image: string; alt: string; place: string | null; category: string;
};
export type ProfileGalleryResult =
  | { status: "ok"; recipes: ProfileRecipe[] }
  | { status: "empty" }
  | { status: "error"; message: string };
