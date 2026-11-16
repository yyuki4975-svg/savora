"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { RecipeDetail } from "../lib/api/savora-client";
import { publicRecipeMedia } from "../lib/api/media-reference";
import { useWebsiteCopy } from "./use-website-copy";
import { useI18n } from "./i18n";
import styles from "./kitchen-passed-bowl.module.css";

export type KitchenTool = "recipe-box" | "meal-planner" | "grocery-list" | "pantry";

const tools: Array<{ id: KitchenTool; href: string; label: string }> = [
  { id: "recipe-box", href: "/recipe-box", label: "Recipe box" },
  { id: "meal-planner", href: "/meal-planner", label: "Meal planner" },
  { id: "grocery-list", href: "/grocery-list", label: "Prep list" },
  { id: "pantry", href: "/pantry", label: "Pantry" },
];

export type KitchenMode = "loading" | "guest" | "account" | "unavailable";

/**
 * Shared frame for the personal kitchen tools: sub-navigation, title and an honest
 * statement of where this kitchen's data lives (this device, the account, or unavailable).
 */
export function KitchenShell({ active, title, lede, mode, message, statusActions, actions, children }: {
  active: KitchenTool;
  title: string;
  lede: string;
  mode: KitchenMode;
  message: string;
  statusActions?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const copy = useWebsiteCopy();
  const modeLabel = mode === "account" ? "Account kitchen" : mode === "guest" ? "This device only" : mode === "loading" ? "Loading" : "Unavailable";
  return (
    <div className={styles.page}>
      <nav className={styles.toolNav} aria-label={copy("My kitchen")}>
        <div className={styles.toolNavInner}>
          <span className={styles.toolNavTitle}>{copy("My kitchen")}</span>
          <ul>
            {tools.map((tool) => (
              <li key={tool.id}><Link href={tool.href} aria-current={tool.id === active ? "page" : undefined}>{copy(tool.label)}</Link></li>
            ))}
          </ul>
        </div>
      </nav>
      <header className={styles.toolHeader}>
        <div className={styles.toolHeaderInner}>
          <div>
            <h1>{copy(title)}</h1>
            <p>{copy(lede)}</p>
          </div>
          {actions ? <div className={styles.headerActions}>{actions}</div> : null}
        </div>
        <div className={styles.statusBar} data-mode={mode}>
          <p role="status"><span className={styles.modeBadge}><i aria-hidden="true" />{copy(modeLabel)}</span><span>{copy(message)}</span></p>
          {statusActions ? <div>{statusActions}</div> : null}
        </div>
      </header>
      <div className={styles.toolBody}>{children}</div>
    </div>
  );
}

export type RecipeSummary = { title: string; image: string | null };

/** Titles and photos for saved published recipes, read from the first-party catalogue route. */
export function useRecipeSummaries(slugs: string[]) {
  const { locale } = useI18n();
  const key = [...new Set(slugs)].sort().slice(0, 48).join("|");
  const [summaries, setSummaries] = useState<Record<string, RecipeSummary>>({});
  useEffect(() => {
    if (!key) return;
    const controller = new AbortController();
    let active = true;
    (async () => {
      const result: Record<string, RecipeSummary> = {};
      for (const slug of key.split("|")) {
        try {
          const response = await fetch(`/api/catalog/recipes/${encodeURIComponent(slug)}?locale=${locale}`, { signal: controller.signal });
          if (!response.ok) continue;
          const recipe = await response.json() as RecipeDetail;
          result[slug] = { title: recipe.title, image: publicRecipeMedia(recipe.primaryMedia) };
        } catch { if (controller.signal.aborted) return; }
      }
      if (active) setSummaries(result);
    })();
    return () => { active = false; controller.abort(); };
  }, [key, locale]);
  return summaries;
}

export function slugTitle(slug: string) {
  const words = slug.replaceAll("-", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
