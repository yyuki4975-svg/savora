"use client";

import { useEffect, useState } from "react";
import type { Locale } from "./i18n";

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string[]>>();
let unavailableUntil = 0;
let queue: Promise<unknown> = Promise.resolve();

export async function translateTexts(texts: string[], target: Locale, source?: Locale) {
  if (!texts.length || target === source) return texts;
  const keyFor = (text: string) => JSON.stringify([source ?? "auto", target, text]);
  const missing = [...new Set(texts.filter(text => text.trim() && /\p{L}/u.test(text) && text.length <= 3000 && !cache.has(keyFor(text))))];
  if (Date.now() < unavailableUntil) return texts.map(text => cache.get(keyFor(text)) ?? text);
  for (let start = 0; start < missing.length;) {
    const batch: string[] = []; let size = 0;
    while (start < missing.length && batch.length < 80 && size + missing[start].length <= 3000) {
      const text = missing[start++]; batch.push(text); size += text.length;
    }
    const key = JSON.stringify([source ?? "auto", target, batch]);
    let work = pending.get(key);
    if (!work) {
      if (pending.size >= 20) break;
      work = queue.then(async () => {
        if (Date.now() < unavailableUntil) return batch;
        if (batch.every(text => cache.has(keyFor(text)))) return batch.map(text => cache.get(keyFor(text))!);
        try {
          const response = await fetch("/api/translate", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: batch, target, source }), signal: AbortSignal.timeout(60000),
          });
          if (!response.ok) { unavailableUntil = Date.now() + (response.status === 429 ? 30000 : 300000); return batch; }
          const data = await response.json() as { translations?: unknown; partial?: unknown };
          if (!Array.isArray(data.translations) || data.translations.length !== batch.length || data.translations.some(text => typeof text !== "string")) return batch;
          const translated = data.translations as string[];
          translated.forEach((text, i) => {
            // A partial answer leaves untranslated text as-is; do not remember that as a translation.
            if (data.partial === true && text === batch[i]) return;
            while (cache.size >= 5000) cache.delete(cache.keys().next().value!);
            cache.set(keyFor(batch[i]), text);
          });
          return translated;
        } catch { unavailableUntil = Date.now() + 30000; return batch; }
      });
      queue = work.catch(() => {});
      pending.set(key, work);
    }
    await work; pending.delete(key);
    if (Date.now() < unavailableUntil) break;
  }
  return texts.map(text => cache.get(keyFor(text)) ?? text);
}

export function useEnglishSearchQuery(query: string, locale: Locale) {
  const [translated, setTranslated] = useState(query);
  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      if (!query.trim() || locale === "en") {
        setTranslated(query);
        return;
      }
      void translateTexts([query], "en", locale).then(([value]) => { if (active) setTranslated(value ?? query); });
    }, 280);
    return () => { active = false; window.clearTimeout(timer); };
  }, [locale, query]);
  return translated;
}

const catalogCache = new Map<string, string>();

/** Reviewed catalog titles/summaries only (no model call). Unknown text is returned unchanged. */
export async function translateCatalogTexts(texts: string[], target: Locale) {
  if (target === "en") return texts;
  const key = (text: string) => `${target}\u0000${text}`;
  const missing = [...new Set(texts.filter(text => text.trim() && /\p{L}/u.test(text) && text.length <= 3000 && !catalogCache.has(key(text))))];
  for (let start = 0; start < missing.length; start += 80) {
    const batch = missing.slice(start, start + 80);
    try {
      const response = await fetch("/api/catalog/localized-text", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texts: batch, target }), signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) break;
      const data = await response.json() as { translations?: unknown };
      if (!Array.isArray(data.translations) || data.translations.length !== batch.length || data.translations.some(text => typeof text !== "string")) break;
      (data.translations as string[]).forEach((text, i) => { while (catalogCache.size >= 5000) catalogCache.delete(catalogCache.keys().next().value!); catalogCache.set(key(batch[i]), text); });
    } catch { break; }
  }
  return texts.map(text => catalogCache.get(key(text)) ?? text);
}
