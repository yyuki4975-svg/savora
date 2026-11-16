import type { DiscoveryRecipe } from "../api/published-discovery";

/** Compare the asset, not its thumbnail size, crop parameters, or recipe slug. */
export function exhibitionImageIdentity(src: string): string {
  let decoded = src;
  try { decoded = decodeURIComponent(src); } catch { /* Keep malformed escapes literal. */ }
  const commons = decoded.match(/(?:Special:Redirect\/file\/|\/wiki\/File:)([^?#]+)/i)
    ?? decoded.match(/wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[a-f0-9]\/[^/]+\/([^/?#]+)/i);
  if (commons) return `commons:${commons[1].normalize("NFC").replace(/ /g, "_")}`;
  try {
    const url = new URL(decoded, "https://savora.invalid");
    // Unsplash/TheMealDB resize aliases do not make a new photograph.
    return `${url.hostname}${url.pathname.replace(/\/preview\/?$/, "")}`;
  } catch { return decoded.split(/[?#]/)[0]; }
}

export function exhibitionTitleMatches(title: string, term: string): boolean {
  const fold = (text: string) => text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("en");
  const words = fold(term).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!words) return false;
  // Match whole words (and simple plurals), never "mole" inside "guacamole".
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${words}(?:s|es)?(?:$|[^\\p{L}\\p{N}])`, "u").test(fold(title));
}

/** One allocator per exhibition. Missing relevant photography stays missing. */
export function createExhibitionPhotoPicker(recipes: readonly DiscoveryRecipe[], reserved: readonly string[] = []) {
  const usedImages = new Set(reserved.map(exhibitionImageIdentity));
  const usedRecipes = new Set<string>();
  return (terms: readonly string[]): DiscoveryRecipe | undefined => {
    const match = recipes.find(recipe => recipe.hasPhotography
      && !usedRecipes.has(recipe.slug)
      && !usedImages.has(exhibitionImageIdentity(recipe.image))
      && terms.some(term => exhibitionTitleMatches(recipe.title, term)));
    if (match) {
      usedRecipes.add(match.slug);
      usedImages.add(exhibitionImageIdentity(match.image));
    }
    return match;
  };
}
