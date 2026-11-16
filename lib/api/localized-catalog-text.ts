import "server-only";
import { listDiscoveryRecipes } from "./savora-client";

const locales = ["zh", "ja", "fr", "it", "es"] as const;
export type CatalogTextLocale = (typeof locales)[number];
const ttlMs = 5 * 60 * 1000;
const cache = new Map<string, { expires: number; text: Map<string, string | null> }>();
const inflight = new Map<string, Promise<Map<string, string | null>>>();

export function isCatalogTextLocale(value: unknown): value is CatalogTextLocale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

/**
 * Exact English recipe title/summary -> accepted localized text, for every Published recipe. The page translator
 * asks for text nodes by their English value, so a recipe name on Explore, Home, place or profile cards resolves to
 * the reviewed catalog translation instead of depending on the (optional) machine-translation cache. An English
 * string shared by two recipes with different translations maps to null (left to the generic path).
 */
export async function catalogTextTranslations(locale: CatalogTextLocale): Promise<Map<string, string | null>> {
  const hit = cache.get(locale);
  if (hit && hit.expires > Date.now()) return hit.text;
  let work = inflight.get(locale);
  if (!work) {
    work = (async () => {
      const [english, localized] = await Promise.all([listDiscoveryRecipes("en"), listDiscoveryRecipes(locale)]);
      const text = new Map<string, string | null>();
      if (english.status !== "ok" || localized.status !== "ok") return text;
      const bySlug = new Map(localized.data.items.map((item) => [item.slug, item]));
      const add = (source: string | null | undefined, target: string | null | undefined) => {
        const key = source?.trim();
        const value = target?.trim();
        if (!key || !value || key === value) return;
        const previous = text.get(key);
        text.set(key, previous === undefined || previous === value ? value : null);
      };
      for (const item of english.data.items) {
        const other = bySlug.get(item.slug);
        if (!other) continue;
        add(item.title, other.title);
        add(item.summary, other.summary);
      }
      cache.set(locale, { expires: Date.now() + ttlMs, text });
      return text;
    })().finally(() => { inflight.delete(locale); });
    inflight.set(locale, work);
  }
  return work;
}
