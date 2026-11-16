import { TARGETS } from "./catalog-plan";

export interface EditorialCorrection { locale: string; hash: string; source: string; text: string; reason: string }
/** Model review and a state label alone are never evidence of actual editorial coverage. */
export function assertEditorialCoverage(
  sources: ReadonlyArray<{ hash: string; source: string }>,
  rows: ReadonlyArray<{ locale: string; source_sha256: string; source_text: string; translated_text: string | null; state: string; review: { method?: string; reason?: string } | null }>,
): void {
  const expected = new Map(sources.map(source => [source.hash, source.source]));
  const seen = new Set<string>();
  for (const row of rows) {
    const key = row.locale + ":" + row.source_sha256;
    if (!(TARGETS as readonly string[]).includes(row.locale) || seen.has(key) ||
      expected.get(row.source_sha256) !== row.source_text || row.state !== "Reviewed" ||
      row.review?.method !== "Codex-editorial" || typeof row.review.reason !== "string" || !row.review.reason.trim() ||
      typeof row.translated_text !== "string" || !row.translated_text.trim()) {
      throw new Error("Full-catalog acceptance requires source-bound actual Codex editorial coverage.");
    }
    if (!numericFactsMatch(row.source_text, row.translated_text)) throw new Error("Reviewed translations contain changed numeric facts; editorial correction is required.");
    seen.add(key);
  }
  if (seen.size !== expected.size * TARGETS.length) throw new Error("Full-catalog acceptance requires complete five-target editorial coverage.");
}
/** A rejected audit is not evidence that its saved translation needs regeneration. */
export function isEditorialOnlyFinding(review: { reason?: string } | null): boolean {
  return review?.reason === "Semantic audit output invalid; editorial review required.";
}
/** Generation-first never spends again on a saved draft merely because an audit flagged it. */
export function catalogWorkerPhases(generateOnly: boolean): ReadonlyArray<"Generated" | "Pending" | "NeedsChanges"> {
  return generateOnly ? ["Pending", "NeedsChanges"] : ["Generated", "Pending", "NeedsChanges"];
}
export function needsGenerationRepair(unit: { source: string; translated: string | null; review: { reason?: string } | null }): boolean {
  if (!unit.translated) return true;
  if (unit.translated !== unit.source) return false;
  // An unchanged proper noun plus a model semantic flag is not proof of a failed draft.
  return /^(Provider response failed whole-batch validation;|Previous generation failed validation or delivery;|Mechanical validation rejected (the model output|saved output);)/.test(unit.review?.reason ?? "");
}
export function generationDraftState(invalidItem: boolean): "Generated" | "NeedsChanges" {
  return invalidItem ? "NeedsChanges" : "Generated";
}
const numberPattern = /\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?(?:[ \t]*[¼½¾⅓⅔⅛⅜⅝⅞])?|[¼½¾⅓⅔⅛⅜⅝⅞]/g;
const glyphFractions: Record<string, readonly [number, number]> = {
  "¼": [1, 4], "½": [1, 2], "¾": [3, 4], "⅓": [1, 3], "⅔": [2, 3],
  "⅛": [1, 8], "⅜": [3, 8], "⅝": [5, 8], "⅞": [7, 8],
};
const gcd = (left: number, right: number): number => right === 0 ? Math.abs(left) : gcd(right, left % right);
function canonicalNumericFact(raw: string): string {
  const value = raw.trim().replace(",", ".");
  const glyph = value.match(/^(\d+)?\s*([¼½¾⅓⅔⅛⅜⅝⅞])$/);
  if (glyph) {
    const [numerator, denominator] = glyphFractions[glyph[2]!]!;
    const whole = Number(glyph[1] ?? 0);
    const total = whole * denominator + numerator;
    const divisor = gcd(total, denominator);
    return `${total / divisor}/${denominator / divisor}`;
  }
  const fraction = value.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (fraction) {
    const denominator = Number(fraction[3]);
    const total = Number(fraction[1] ?? 0) * denominator + Number(fraction[2]);
    const divisor = gcd(total, denominator);
    return `${total / divisor}/${denominator / divisor}`;
  }
  if (/^\d+(?:\.\d+)?$/.test(value)) {
    const [whole, decimals = ""] = value.split(".");
    const denominator = 10 ** decimals.length;
    const total = Number(whole) * denominator + Number(decimals || 0);
    const divisor = gcd(total, denominator);
    return `${total / divisor}/${denominator / divisor}`;
  }
  return value;
}
export function numericFactsMatch(source: string, translation: string): boolean {
  // Preserve quantities while allowing equivalent decimal, slash-fraction and vulgar-fraction typography.
  const numbers = (text: string) => [...text.replace(/⁄/g, "/").replace(/(\d)\s*\/\s*(\d)/g, "$1/$2")
    .replace(/(\d)[ \t]+([¼½¾⅓⅔⅛⅜⅝⅞])/g, "$1$2").matchAll(numberPattern)].map(match => canonicalNumericFact(match[0])).sort();
  return JSON.stringify(numbers(source)) === JSON.stringify(numbers(translation));
}
/** Canonical typography for Chinese culinary quantities; meaning and units are unchanged. */
export function normalizeChineseCulinarySpacing(value: string): string {
  return value
    .replace(/(\d|[¼½¾⅓⅔⅛⅜⅝⅞])\s+(?=(?:杯|汤匙|茶匙|毫升|升|克|千克|盎司|磅|°C|°F))/gu, "$1")
    .replace(/(杯|汤匙|茶匙|毫升|千克|盎司|磅)\s+(?=\p{Script=Han})/gu, "$1");
}
export function validateEditorialCorrections(value: unknown): EditorialCorrection[] {
  if (!Array.isArray(value) || !value.length || value.length > 1000) throw new Error("Invalid editorial correction file.");
  const seen = new Set<string>();
  return value.map(row => {
    if (!row || typeof row !== "object" || Array.isArray(row) || Object.keys(row).sort().join(",") !== "hash,locale,reason,source,text") throw new Error("Invalid editorial correction fields.");
    const item = row as EditorialCorrection;
    if (!(TARGETS as readonly string[]).includes(item.locale) || !/^[a-f0-9]{64}$/.test(item.hash) ||
      typeof item.source !== "string" || !item.source.trim() || item.source.length > 3000 ||
      typeof item.text !== "string" || !item.text.trim() || item.text.length > 12000 ||
      typeof item.reason !== "string" || !item.reason.trim() || item.reason.length > 1000 ||
      /__SAVORA_NUMBER_|<\/?[a-z][^>]*>|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/i.test(item.text + item.reason)) throw new Error("Unsafe editorial correction.");
    if (!numericFactsMatch(item.source, item.text)) throw new Error("Editorial correction changes quantities.");
    const key = item.locale + item.hash;
    if (seen.has(key)) throw new Error("Duplicate editorial correction.");
    seen.add(key); return item;
  });
}
