"use client";

import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { useWebsiteCopy } from "../../use-website-copy";
import styles from "./related-recipes.module.css";

export type RelatedRecipe = {
  slug: string;
  title: string;
  image: string;
  alt: string;
  place: string | null;
  minutes: number | null;
  reason: { kind: "place" | "ingredient"; value: string };
};

export function RelatedRecipesView({ recipes }: { recipes: RelatedRecipe[] }) {
  const copy = useWebsiteCopy();
  return (
    <section className={styles.related} aria-labelledby="related-recipes-title" data-website-page>
      <div className={styles.inner}>
        <header>
          <h2 id="related-recipes-title">{copy("Keep cooking")}</h2>
          <p>{copy("Recipes from the same place, or built on the same ingredients.")}</p>
        </header>
        <div className={styles.grid}>
          {recipes.map((recipe, index) => (
            <Link href={`/recipes/${recipe.slug}`} key={recipe.slug} style={{ "--i": index } as CSSProperties}>
              <span className={styles.image}><Image src={recipe.image} alt={recipe.alt} fill sizes="(max-width: 560px) 92vw, (max-width: 1000px) 45vw, 24vw" /></span>
              <small className={styles.reason}>{copy(recipe.reason.kind === "place" ? `Also from ${recipe.reason.value}` : `Also uses ${recipe.reason.value}`)}</small>
              <strong>{recipe.title}</strong>
              <small>{[recipe.place, recipe.minutes ? `${recipe.minutes} min` : null].filter(Boolean).join(" · ")}</small>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
