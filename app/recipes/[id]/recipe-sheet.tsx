"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import styles from "./recipe-detail.module.css";

const sizes = ["fit", "standard", "large"] as const;
type RecipeSize = (typeof sizes)[number];

const labels: Record<RecipeSize, string> = {
  fit: "Fit page",
  standard: "100%",
  large: "110%",
};

export function RecipeSheet({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<RecipeSize>("fit");
  const [scale, setScale] = useState(1);
  const [canvasHeight, setCanvasHeight] = useState<number | null>(null);
  const articleRef = useRef<HTMLElement>(null);
  const currentIndex = sizes.indexOf(size);

  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!article) return;

    const updateScale = () => {
      const paperWidth = article.offsetWidth;
      const paperHeight = article.scrollHeight;
      // Phones and tablets read the sheet at full size; only desktops fit or zoom it.
      const isNarrow = window.innerWidth < 1100;
      const nextScale = isNarrow
        ? 1
        : size === "fit"
          ? Math.min(1, (window.innerWidth - 48) / paperWidth, Math.max(0.75, (window.innerHeight - 108) / paperHeight))
          : size === "large" ? 1.1 : 1;
      setScale(nextScale);
      setCanvasHeight(Math.ceil(paperHeight * nextScale) + 48);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(article);
    window.addEventListener("resize", updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [size]);

  function changeSize(direction: -1 | 1) {
    const nextIndex = Math.min(sizes.length - 1, Math.max(0, currentIndex + direction));
    setSize(sizes[nextIndex]);
  }

  return (
    <div className={styles.recipeStage}>
      <div className={styles.sizeControl} role="group" aria-label="Recipe page size">
        <button
          type="button"
          onClick={() => changeSize(-1)}
          disabled={currentIndex === 0}
          aria-label="Make recipe smaller"
        >
          −
        </button>
        <output aria-live="polite">{labels[size]}</output>
        <button
          type="button"
          onClick={() => changeSize(1)}
          disabled={currentIndex === sizes.length - 1}
          aria-label="Make recipe larger"
        >
          +
        </button>
      </div>
      <div className={styles.recipeCanvas} style={canvasHeight ? { height: `${canvasHeight}px` } : undefined}>
        <article
          ref={articleRef}
          className={`${styles.recipe} ${styles[`recipe${size[0].toUpperCase()}${size.slice(1)}`]}`}
          style={{ transform: `scale(${scale})` }}
        >
          {children}
        </article>
      </div>
    </div>
  );
}
