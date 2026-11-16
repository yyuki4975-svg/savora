import Image from "next/image";
import Link from "next/link";
import { greenIngredientStories } from "../../lib/editorial/green-ingredient-stories";
import styles from "./food-culture-column.module.css";
import { localImage } from "../../lib/media/local-media";

/** Green ingredients only; country exhibitions belong to World Map. */
export function FoodCultureColumn({ basePath }: { basePath: string }) {
  return (
    <section className={styles.foodCulture} id="stories" aria-labelledby="food-culture-title">
      <div className={styles.inner}>
        <header className={styles.cultureHeading}>
          <h2 id="food-culture-title">The green pantry</h2>
          <p>Discover fresh green ingredients and what to cook with them.</p>
        </header>
        <div className={styles.ingredientRail}>
          {greenIngredientStories.map(ingredient => (
            <Link className={styles.ingredientCard} href={`${basePath}?q=${ingredient.query}#explore-controls`} key={ingredient.query}>
              <Image src={localImage(ingredient.src)} alt={ingredient.label} fill sizes="(max-width: 640px) 92vw, (max-width: 1000px) 45vw, 50vw" />
              <span className={styles.shade} aria-hidden="true" />
              <span className={styles.cardCopy}><strong>{ingredient.label}</strong><span>{ingredient.copy}</span><span className={styles.arrow} aria-hidden="true">↗</span></span>
            </Link>
          ))}
        </div>
        <details className={styles.photoSources}>
          <summary>Image sources</summary>
          <ul>{greenIngredientStories.map(ingredient => <li key={ingredient.query}><a href={ingredient.source} target="_blank" rel="noreferrer noopener"><span>{ingredient.label}</span><span translate="no"> — {ingredient.credit} ↗</span></a></li>)}</ul>
        </details>
      </div>
    </section>
  );
}
