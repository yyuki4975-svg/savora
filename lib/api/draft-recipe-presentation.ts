import type { DraftRecipeDetail, DraftRecipeList } from "./savora-client";

export type DraftRecipeSummary = DraftRecipeList["items"][number];
export type DraftRecipeMedia = NonNullable<DraftRecipeSummary["primaryMedia"]>;

export type SourceLabels = {
  area: string;
  category: string;
  tags: string[];
};

const generatedStorageKeyPattern = /^images\/generated\/themealdb\/[a-z0-9-]+-v\d+\.png$/;
const externalMealSlugPattern = /^themealdb-(\d{1,12})-/;
const summaryPattern = /^.* is a (.+?) recipe(?: associated by the provider with (.+?))?, imported from TheMealDB for editorial review\.$/u;
const culturalNotePattern = /^TheMealDB labels this entry as (.+?) \/ (.+?)\.(?: Provider tags: (.+?)\.)? These labels are source metadata, not a definitive origin claim\.$/u;

const areaFlags: Record<string, string> = {
  American: "🇺🇸", Argentina: "🇦🇷", Australian: "🇦🇺", British: "🇬🇧", Brazilian: "🇧🇷", Canadian: "🇨🇦", Chinese: "🇨🇳",
  Croatian: "🇭🇷", Egyptian: "🇪🇬", Filipino: "🇵🇭", France: "🇫🇷", Greek: "🇬🇷",
  Dutch: "🇳🇱", French: "🇫🇷", India: "🇮🇳", Indian: "🇮🇳", Indonesian: "🇮🇩", Irish: "🇮🇪", Italian: "🇮🇹", Jamaican: "🇯🇲", Japanese: "🇯🇵",
  Kenyan: "🇰🇪", Malaysian: "🇲🇾", Mexican: "🇲🇽", Moroccan: "🇲🇦", Netherlands: "🇳🇱",
  Norway: "🇳🇴", Polish: "🇵🇱", Portuguese: "🇵🇹", Russian: "🇷🇺", Slovakia: "🇸🇰", Korean: "🇰🇷",
  Spanish: "🇪🇸", Thai: "🇹🇭", Tunisian: "🇹🇳", Turkish: "🇹🇷", Ukrainian: "🇺🇦",
  "United States": "🇺🇸", Uruguayan: "🇺🇾", Venezuela: "🇻🇪", Vietnamese: "🇻🇳",
};

function normalizeLabels(area: string | undefined, category: string | undefined, tags: string[] = []): SourceLabels {
  const normalizedArea = !area || area === "an unspecified area" ? "Global" : area.trim();
  const normalizedCategory = !category || category === "an unspecified category" ? "Recipe" : category.trim();
  return { area: normalizedArea, category: normalizedCategory, tags: tags.filter(Boolean) };
}

export function sourceLabelsFromSummary(summary: string | null): SourceLabels {
  const match = summary?.match(summaryPattern);
  return normalizeLabels(match?.[2], match?.[1]);
}

export function sourceLabelsFromDetail(recipe: DraftRecipeDetail): SourceLabels {
  const match = recipe.culturalNote?.match(culturalNotePattern);
  if (!match) return sourceLabelsFromSummary(recipe.summary);
  return normalizeLabels(match[1], match[2], match[3]?.split(",").map((tag) => tag.trim()) ?? []);
}

export function externalMealIdFromSlug(slug: string) {
  return slug.match(externalMealSlugPattern)?.[1] ?? null;
}

export function sourceAreaFlag(area: string) {
  return areaFlags[area] ?? "🌍";
}

export function sensoryProfile(category: string) {
  if (/dessert|baking|breakfast/i.test(category)) return { taste: "Sweet & buttery", texture: "Tender / creamy" };
  if (/seafood/i.test(category)) return { taste: "Briny & bright", texture: "Tender / flaky" };
  if (/beef|lamb|goat|pork/i.test(category)) return { taste: "Rich & savory", texture: "Tender / hearty" };
  if (/chicken/i.test(category)) return { taste: "Savory & aromatic", texture: "Juicy / tender" };
  if (/vegetarian|vegan|side/i.test(category)) return { taste: "Fresh & savory", texture: "Crisp / tender" };
  if (/pasta/i.test(category)) return { taste: "Savory & comforting", texture: "Silky / al dente" };
  if (/soup|starter/i.test(category)) return { taste: "Aromatic & balanced", texture: "Brothy / tender" };
  return { taste: "Savory & aromatic", texture: "Comforting / layered" };
}

export function draftMediaUrl(media: DraftRecipeMedia | DraftRecipeDetail["media"][number] | null) {
  if (!media) return null;
  if (media.storageKey && generatedStorageKeyPattern.test(media.storageKey)) {
    return `/${media.storageKey}`;
  }
  if (!media.sourceUrl) return null;
  try {
    const url = new URL(media.sourceUrl);
    if (url.protocol !== "https:" || url.username || url.password ||
        url.hostname !== "www.themealdb.com" || !url.pathname.startsWith("/images/media/meals/")) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

const chineseUnits: Record<string, string> = {
  c: "杯", cup: "杯", cups: "杯", t: "茶匙", tsp: "茶匙", teaspoon: "茶匙", teaspoons: "茶匙",
  tbsp: "汤匙", tablespoon: "汤匙", tablespoons: "汤匙", ml: "毫升", l: "升", g: "克", kg: "千克",
  oz: "盎司", ounce: "盎司", ounces: "盎司", lb: "磅", lbs: "磅", pound: "磅", pounds: "磅",
};

function chineseLeadingDecimal(value: string) {
  const mixed = /^(\d+)\s+(\d+)\/(\d+)(.*)$/u.exec(value);
  if (mixed) return `${Number((Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3])).toFixed(2))}${mixed[4]}`;
  const simple = /^(\d+)\/(\d+)(.*)$/u.exec(value);
  if (simple) return `${Number((Number(simple[1]) / Number(simple[2])).toFixed(2))}${simple[3]}`;
  const glyphs: Record<string, number> = { "⅛": 1 / 8, "¼": 1 / 4, "⅓": 1 / 3, "⅜": 3 / 8, "½": 1 / 2, "⅝": 5 / 8, "⅔": 2 / 3, "¾": 3 / 4, "⅞": 7 / 8 };
  const glyph = /^(\d*)\s*([⅛¼⅓⅜½⅝⅔¾⅞])(.*)$/u.exec(value);
  if (glyph) return `${Number((Number(glyph[1] || 0) + glyphs[glyph[2]]!).toFixed(2))}${glyph[3]}`;
  return value;
}

export function ingredientMeasure(ingredient: DraftRecipeDetail["ingredients"][number], locale = "en") {
  const quantity = ingredient.quantity === null ? null : Number(ingredient.quantity);
  const fractionGlyphs = [
    { value: 1 / 8, glyph: "1/8" },
    { value: 1 / 4, glyph: "1/4" },
    { value: 1 / 3, glyph: "1/3" },
    { value: 3 / 8, glyph: "3/8" },
    { value: 1 / 2, glyph: "1/2" },
    { value: 5 / 8, glyph: "5/8" },
    { value: 2 / 3, glyph: "2/3" },
    { value: 3 / 4, glyph: "3/4" },
    { value: 7 / 8, glyph: "7/8" },
  ];
  const formatQuantity = (value: number) => {
    if (locale === "zh") return String(Number(value.toFixed(2)));
    if (Number.isInteger(value)) return String(value);
    const whole = Math.floor(value);
    const remainder = value - whole;
    const nearest = fractionGlyphs.reduce((best, candidate) =>
      Math.abs(candidate.value - remainder) < Math.abs(best.value - remainder) ? candidate : best);
    if (Math.abs(nearest.value - remainder) <= 0.02) {
      return `${whole > 0 ? `${whole} ` : ""}${nearest.glyph}`;
    }
    return String(Number(value.toFixed(2)));
  };
  const displayQuantity = quantity === null ? null : formatQuantity(quantity);
  const unit = locale === "zh" && ingredient.unit ? chineseUnits[ingredient.unit.trim().toLowerCase()] ?? ingredient.unit : ingredient.unit;
  const structuredMeasure = locale === "zh"
    ? `${displayQuantity ?? ""}${unit ?? ""}`
    : [displayQuantity, unit].filter((part) => part !== null && part !== "").join(" ");
  if (structuredMeasure) return structuredMeasure;
  const preparationNote = ingredient.preparationNote?.trim();
  if (preparationNote && !/^quantity pending editorial review\.?$/i.test(preparationNote)) {
    const decimalMeasure = preparationNote.match(/^(\d*\.\d+)(.*)$/u);
    if (decimalMeasure) return `${formatQuantity(Number(decimalMeasure[1]))}${decimalMeasure[2]}`;
    return locale === "zh" ? chineseLeadingDecimal(preparationNote).replace(/^(\d+(?:\.\d+)?)\s+(?=\p{Script=Han})/u, "$1") : preparationNote;
  }
  if (preparationNote) return "As needed";
  return "To taste";
}
