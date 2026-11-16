"use client";
import { useEffect, useRef } from "react";
import { useCatalogRecipe } from "./use-catalog-recipe";
import { ingredientMeasure } from "../lib/api/draft-recipe-presentation";
import type { RecipeDetail } from "../lib/api/savora-client";
import { methodForDisplay, recipeSummaryForDisplay } from "./recipe-presentation";

/** Source/version-specific bindings avoid ambiguous shared ingredient counters in a DOM text cache. */
export function CatalogRecipeBinding({ english }: { english: RecipeDetail }) {
  const recipe = useCatalogRecipe(english);
  const originals = useRef(new WeakMap<HTMLElement, string>());
  useEffect(() => {
    const root = document.querySelector(`[data-recipe-slug="${english.slug}"]`);
    if (!root) return;
    const fields = new Map<string, string>([["title", recipe.title], ["summary", recipeSummaryForDisplay(recipe.summary, english.summary, recipe.locale)]]);
    recipe.ingredients.forEach((item, index) => {
      fields.set(`ingredient:${index}:name`, item.name);
      fields.set(`ingredient:${index}:measure`, ingredientMeasure(item, recipe.locale));
      fields.set(`ingredient:${index}:note`, item.preparationNote ?? "");
    });
    recipe.steps.forEach((item, index) => fields.set(`step:${index}`, methodForDisplay(item.instruction, english.steps[index]?.instruction ?? "")));
    root.querySelectorAll<HTMLElement>("[data-catalog-field]").forEach(element => {
      if (!originals.current.has(element)) originals.current.set(element, element.textContent ?? "");
      const text = recipe === english ? originals.current.get(element) : fields.get(element.dataset.catalogField ?? "");
      if (text !== undefined && element.textContent !== text) element.textContent = text;
    });
  }, [english.slug, recipe]);
  return null;
}
