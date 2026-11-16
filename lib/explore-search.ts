// Pure Explore search and ingredient-facet matching (no server-only imports, so it is unit-testable).
// Search: every query word must appear somewhere in the recipe's searchable text (any order, punctuation and
// accents ignored, English plus the five accepted locales). Ingredient facets: whole-word matching with explicit
// exclusions, so "black pepper", "fish sauce", "rice vinegar" or "lemongrass" do not file a recipe under
// "Chile & pepper", "Fish", "Rice" or "Citrus".

/** Lower-case, accent-insensitive form used on both sides of every comparison. */
export function normalizeSearchText(value: string): string {
  return value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("en");
}

/** Query words: letters/digits only (so "pork, rib" == "pork rib"); a CJK run stays one word. */
export function searchTokens(query: string): string[] {
  return normalizeSearchText(query).split(/[^\p{L}\p{N}\p{M}]+/u).filter(Boolean);
}

/** True when every query word occurs in the already-normalized haystack. */
export function matchesSearch(haystack: string, tokens: readonly string[]): boolean {
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

/** 0 = all words in the title, 1 = elsewhere. Used only to order results while a search is active. */
export function searchRank(title: string, tokens: readonly string[]): number {
  const normalized = normalizeSearchText(title);
  return tokens.every((token) => normalized.includes(token)) ? 0 : 1;
}

const peppercornPhrases = /\b(?:(?:black|white|ground|cracked|crushed|freshly ground|lemon|pink|sichuan|szechuan|sansho)\s+pepper(?:corns?)?|peppercorns?|salt\s*(?:,|and|&)\s*(?:freshly ground\s+|black\s+)?pepper|pepper\s+(?:to taste|and salt)|pepper\s+mill)\b/g;
const spiceOnly = /\b(?:ground|dried|powdered|dry)\s+(?:coriander|thyme|oregano|basil|parsley|dill|mint|sage|rosemary|tarragon|chives?)\b|\b(?:coriander|dill|fennel|cumin)\s+seeds?\b|\bcoriander\s+powder\b/g;

const facetMatchers: Record<string, (ingredient: string) => boolean> = {
  tomato: (i) => /\btomato(?:e?s)?\b/.test(i),
  rice: (i) => /\brice\b/.test(i) && !/\brice[\s-]+(?:vinegar|wine|flour|noodles?|vermicelli|paper|wrappers?|bran|cakes?|syrup|krispies|milk|malt|cooker|stick)/.test(i) && !/\bglutinous rice flour\b/.test(i),
  chile: (i) => {
    const text = i.replace(peppercornPhrases, " ");
    if (/\b(?:chil(?:e|i|li)(?:es|s)?|gochujang|gochugaru|jalape[nñ]os?|cayenne|habaneros?|serranos?|poblanos?|chipotles?|sambal|sriracha|scotch bonnets?|harissa)\b/.test(text)) return true;
    // "red pepper", "bell peppers", "green pepper": a pepper with a qualifier; a bare "pepper" is the spice.
    return /\b[a-z-]+\s+peppers?\b/.test(text.replace(/\b(?:and|or|of|with|salt|to|taste)\s+peppers?\b/g, " "));
  },
  eggplant: (i) => /\b(?:eggplants?|aubergines?)\b/.test(i),
  citrus: (i) => /\b(?:lemons?|limes?|oranges?|grapefruits?|tangerines?|mandarins?|clementines?|yuzu|kumquats?|citrus)\b/.test(i.replace(/\borange\s+(?:bell\s+)?peppers?\b/g, " ").replace(/\borange\s+(?:food\s+)?colou?ring\b/g, " ")),
  coconut: (i) => /\bcoconuts?\b/.test(i),
  fish: (i) => /\b(?:fish|salmon|cod|tilapia|tuna|trout|mackerel|haddock|hake|sardines?|anchov(?:y|ies)|sea bass|bass|snapper|halibut|herring|swordfish|catfish|carp|eel|flounder|pollock|whiting|monkfish|bonito)\b/.test(i.replace(/\bfish\s+(?:sauce|paste)\b/g, " ")),
  herbs: (i) => /\b(?:herbs?|parsley|basil|cilantro|coriander|mint|dill|chives?|scallions?|spring onions?|green onions?|tarragon|chervil)\b/.test(i.replace(spiceOnly, " ")),
};

/** Facet membership for the Explore ingredient filter; unknown slugs never match. */
export function recipeMatchesIngredientFacet(slug: string, ingredients: readonly string[]): boolean {
  const matcher = facetMatchers[slug];
  return matcher !== undefined && ingredients.some((ingredient) => matcher(normalizeSearchText(ingredient)));
}
