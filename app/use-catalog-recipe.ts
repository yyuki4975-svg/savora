"use client";
import { useEffect, useState } from "react";
import { useI18n } from "./i18n";
import { validLocalizedRecipe } from "./catalog-localization-validation";
import type { RecipeDetail } from "../lib/api/savora-client";

const cache = new Map<string, RecipeDetail>();
export function useCatalogRecipe(english: RecipeDetail) {
  const { locale } = useI18n();
  const [localized, setLocalized] = useState<{ key: string; recipe: RecipeDetail } | null>(null);
  const key = `${english.slug}:${english.version}:${locale}`;
  // Cleanup prevents an older language response replacing the latest choice.
  // Source: https://react.dev/reference/react/useEffect#fetching-data-with-effects
  useEffect(() => {
    if (locale === "en") return;
    if (cache.has(key)) return;
    const controller = new AbortController();
    void fetch(`/api/catalog/recipes/${encodeURIComponent(english.slug)}?locale=${locale}`, { signal: controller.signal, cache: "no-store" })
      .then(async response => {
        if (!response.ok) return;
        const value: unknown = await response.json();
        if (!controller.signal.aborted && validLocalizedRecipe(english, value, locale)) {
          if (cache.size >= 200) cache.delete(cache.keys().next().value!);
          cache.set(key, value); setLocalized({ key, recipe: value });
        }
      }).catch(() => { /* Explicit English fallback; no provider and no stale-language response. */ });
    return () => controller.abort();
  }, [english, key, locale]);
  return locale === "en" ? english : localized?.key === key ? localized.recipe : cache.get(key) ?? english;
}
