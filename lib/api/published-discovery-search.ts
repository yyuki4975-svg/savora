import "server-only";
import { normalizeSearchText } from "../explore-search";
import { listDiscoveryRecipes } from "./savora-client";

const locales = ["zh", "ja", "fr", "it", "es"] as const;
const ttlMs = 5 * 60 * 1000;
let cache: { expires: number; text: Map<string, string> } | null = null;
let inflight: Promise<Map<string, string>> | null = null;

/**
 * Normalized accepted-locale title, summary and ingredient text per recipe slug, so a Chinese, Japanese, French,
 * Italian or Spanish query finds the same dish as the English one. Read-only catalog requests, cached for five
 * minutes; a locale that cannot be loaded is skipped (English search still works).
 */
export async function loadLocalizedSearchText(): Promise<Map<string, string>> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.text;
  inflight ??= (async () => {
    const results = await Promise.all(locales.map((locale) => listDiscoveryRecipes(locale)));
    const text = new Map<string, string>();
    for (const result of results) {
      if (result.status !== "ok") continue;
      for (const item of result.data.items) {
        const part = normalizeSearchText([item.title, item.summary, ...item.ingredients].join(" "));
        text.set(item.slug, `${text.get(item.slug) ?? ""} ${part}`);
      }
    }
    cache = { expires: Date.now() + ttlMs, text };
    return text;
  })().finally(() => { inflight = null; });
  return inflight;
}

const titleCache = new Map<string, { expires: number; titles: Map<string, string> }>();

/** Accepted-locale display titles per recipe slug (for suggestions), cached for five minutes. */
export async function loadLocalizedTitles(locale: string): Promise<Map<string, string>> {
  if (!(locales as readonly string[]).includes(locale)) return new Map();
  const cached = titleCache.get(locale);
  if (cached && cached.expires > Date.now()) return cached.titles;
  const result = await listDiscoveryRecipes(locale);
  const titles = new Map<string, string>();
  if (result.status === "ok") for (const item of result.data.items) titles.set(item.slug, item.title);
  titleCache.set(locale, { expires: Date.now() + ttlMs, titles });
  return titles;
}
