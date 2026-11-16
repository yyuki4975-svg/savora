// Catalog rules ported from Savora.Domain and EfCatalogQueries.

export const PUBLISHED_STATUS = "Published";
export const DRAFT_STATUS = "Draft";
export const VERIFIED_RIGHTS_STATUS = "Verified";
export const PENDING_RIGHTS_STATUS = "Pending";

/**
 * EF stores RecipePlaceRelationType as a string, but EfCatalogQueries sorts the
 * loaded associations in memory by the enum's numeric value, not alphabetically.
 */
export const RELATION_TYPE_ORDER: Readonly<Record<string, number>> = {
  Origin: 0,
  RegionalVariation: 1,
  Diaspora: 2,
  DiscoveryAnchor: 3,
};

export function relationTypeRank(value: string): number {
  return RELATION_TYPE_ORDER[value] ?? Number.MAX_SAFE_INTEGER;
}

/**
 * LINQ-to-Objects OrderBy(string) uses the culture-sensitive default comparer.
 * .NET on current Windows uses ICU, so an ICU collator is the closest match.
 * The parity suite is the arbiter; see server/node/README.md.
 */
const collator = new Intl.Collator("en-US", { usage: "sort", sensitivity: "variant" });

export function compareCultureStrings(left: string, right: string): number {
  return collator.compare(left, right);
}

/** Stable sort (Array.prototype.sort is stable in ES2019+), like LINQ OrderBy. */
export function orderBy<T>(items: readonly T[], compare: (left: T, right: T) => number): T[] {
  return [...items].sort(compare);
}

export interface LocalizedText {
  locale: string;
}

/** Mirrors EfCatalogQueries.SelectTranslation. Throws on an empty set, like Enumerable.First(). */
export function selectTranslation<T extends LocalizedText>(
  translations: readonly T[],
  requestedLocale: string,
  originalLocale: string,
): T {
  const selected =
    translations.find((translation) => translation.locale === requestedLocale) ??
    translations.find((translation) => translation.locale === originalLocale) ??
    translations.find((translation) => translation.locale === "en") ??
    orderBy(translations, (a, b) => compareCultureStrings(a.locale, b.locale))[0];
  if (selected === undefined) throw new Error("Sequence contains no elements (recipe translations).");
  return selected;
}

/** Mirrors EfCatalogQueries.ToPlaceResponse name selection. */
export function selectPlaceName<T extends LocalizedText>(names: readonly T[], requestedLocale: string): T {
  const selected =
    names.find((name) => name.locale === requestedLocale) ??
    names.find((name) => name.locale === "en") ??
    orderBy(names, (a, b) => compareCultureStrings(a.locale, b.locale))[0];
  if (selected === undefined) throw new Error("Sequence contains no elements (place names).");
  return selected;
}

/** Escapes LIKE metacharacters exactly as EfCatalogQueries.EscapeLikePattern (escape character '\'). */
export function escapeLikePattern(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

/**
 * StringComparer.OrdinalIgnoreCase: code units compared after simple (1:1) upper-casing.
 * Multi-character upper-case expansions (e.g. "ß" -> "SS") are not applied, as in .NET.
 */
export function compareOrdinalIgnoreCase(left: string, right: string): number {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index++) {
    const difference = upperCodeUnit(left.charCodeAt(index)) - upperCodeUnit(right.charCodeAt(index));
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function upperCodeUnit(code: number): number {
  if (code < 0x80) return code >= 0x61 && code <= 0x7a ? code - 0x20 : code;
  const upper = String.fromCharCode(code).toUpperCase();
  return upper.length === 1 ? upper.charCodeAt(0) : code;
}

/** Enumerable.Distinct(comparer): keeps the first occurrence of each equivalence class, in order. */
export function distinctBy<T>(items: readonly T[], equals: (left: T, right: T) => boolean): T[] {
  const kept: T[] = [];
  for (const item of items) {
    if (!kept.some((existing) => equals(existing, item))) kept.push(item);
  }
  return kept;
}
