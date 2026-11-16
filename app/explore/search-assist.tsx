"use client";

import Image from "next/image";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import { intents, type SearchLocale } from "../../lib/search/smart-search";
import { pickRail, readTaste, recordTaste, tasteEnabled } from "../../lib/search/taste-profile";
import { useI18n } from "../i18n";
import { useWebsiteCopy } from "../use-website-copy";
import styles from "./search-assist.module.css";

/** How the search was read: intent chips in the reader's language, spelling fixes, close-match notice. */
export function SearchUnderstanding({ intentIds, corrections, relaxed, exactHref }: { intentIds: string[]; corrections: Array<{ from: string; to: string }>; relaxed: boolean; exactHref: string }) {
  const { locale } = useI18n();
  const copy = useWebsiteCopy();
  const labels = intentIds.map((id) => intents.find((intent) => intent.id === id)?.labels[locale as SearchLocale] ?? id);
  if (!labels.length && !corrections.length && !relaxed) return null;
  return <div className={styles.understanding} data-website-localized>
    {labels.length ? <p><span>{copy("Understood as")}</span>{labels.map((label) => <b key={label}>{label}</b>)}</p> : null}
    {corrections.length ? <p><span>{copy("Showing results for")}</span>{corrections.map((item) => <b key={item.from}>{item.to}</b>)}</p> : null}
    {relaxed ? <p className={styles.relaxed}>{copy("No recipe matches every word, so the closest matches are shown.")}</p> : null}
    <NextLink prefetch={false} href={exactHref}>{copy("Search for the exact words instead")}</NextLink>
  </div>;
}

/** Remembers coarse interest signals on this device (see lib/search/taste-profile.ts). */
export function TasteRecorder({ signals, weight, once }: { signals: string[]; weight: number; once: string }) {
  useEffect(() => {
    try {
      const key = `savora-taste-seen:${once}`;
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch { /* still record once per mount */ }
    recordTaste(signals, weight);
  }, [signals, weight, once]);
  return null;
}

export type RailRecipe = { slug: string; title: string; image: string; alt: string; meta: string; signals: string[] };

/** "Picked for you": half by this device's taste, half deliberately different. Hidden without a profile. */
export function ForYouRail({ pool }: { pool: RailRecipe[] }) {
  const copy = useWebsiteCopy();
  const [picked, setPicked] = useState<RailRecipe[]>([]);
  useEffect(() => {
    if (!tasteEnabled()) return;
    const weights = readTaste();
    if (Object.keys(weights).length < 2) return;
    const day = Math.floor(Date.now() / 86400000);
    // Reading device storage after mount is the documented way to avoid hydration mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPicked(pickRail(pool, weights, 8, day));
  }, [pool]);
  if (picked.length < 4) return null;
  return <section className={styles.rail} aria-labelledby="for-you-title">
    {/* Heading copy is already localized; recipe cards below are left to the page translator like the main grid. */}
    <header data-website-localized>
      <div>
        <h2 id="for-you-title">{copy("Picked for you")}</h2>
        <p>{copy("Half follow what you cook and search on this device; half are something different.")}</p>
      </div>
      <NextLink prefetch={false} href="/settings/data">{copy("Manage")}</NextLink>
    </header>
    <ul>
      {picked.map((recipe) => <li key={recipe.slug}>
        <NextLink prefetch={false} href={`/recipes/${recipe.slug}`}>
          <span className={styles.image}><Image src={recipe.image} alt={recipe.alt} fill sizes="(max-width: 760px) 60vw, 22vw" /></span>
          <strong>{recipe.title}</strong>
          {recipe.meta ? <small>{recipe.meta}</small> : null}
        </NextLink>
      </li>)}
    </ul>
  </section>;
}
