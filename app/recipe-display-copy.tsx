"use client";
import { useI18n } from "./i18n";
import { equipmentLabel, recipeLabel } from "./recipe-presentation";
import type { EquipmentItem, RecipeLabelKey } from "./recipe-presentation";

export function RecipeLabel({ name }: { name: RecipeLabelKey }) {
  const { locale } = useI18n();
  return <span data-catalog-localized>{recipeLabel(name, locale)}</span>;
}

export function RecipeEquipment({ items, className }: { items: EquipmentItem[]; className?: string }) {
  const { locale } = useI18n();
  return <div className={className} data-catalog-localized><strong>{recipeLabel("equipment", locale)}</strong><p>{items.map(item => equipmentLabel(item, locale)).join(" · ")}</p></div>;
}
