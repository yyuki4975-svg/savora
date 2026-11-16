"use client";

import { useMemo, useState } from "react";
import { catalogDishes } from "./product-data";
import { DishCard } from "./ui";
import { reviewCount } from '../lib/review-count.mjs';

const ALL = "All";

export function EditorialRecipeFinder({ query }: { query: string }) {
  const [cuisine, setCuisine] = useState(ALL);
  const [mealType, setMealType] = useState(ALL);
  const [time, setTime] = useState(ALL);
  const [dietary, setDietary] = useState(ALL);
  const [sort, setSort] = useState("Recommended");

  const cuisines = useMemo(
    () => [ALL, ...Array.from(new Set(catalogDishes.map((dish) => dish.cuisine))).sort()],
    [],
  );
  const mealTypes = useMemo(
    () => [ALL, ...Array.from(new Set(catalogDishes.map((dish) => dish.mealType))).sort()],
    [],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const results = catalogDishes.filter((dish) => {
      const searchable = [
        dish.name,
        dish.localName,
        dish.country,
        dish.region,
        dish.city,
        dish.cuisine,
        dish.technique,
        dish.mealType,
        ...dish.ingredients,
      ].join(" ").toLowerCase();
      const matchesQuery = !normalized || normalized.split(/\s+/).every((term) => searchable.includes(term));
      const matchesCuisine = cuisine === ALL || dish.cuisine === cuisine;
      const matchesMeal = mealType === ALL || dish.mealType === mealType;
      const matchesTime = time === ALL || dish.minutes <= Number(time);
      const matchesDietary = dietary === ALL
        || (dietary === "No dairy" && !dish.allergens.includes("Dairy"))
        || (dietary === "No gluten" && !dish.allergens.includes("Gluten"))
        || (dietary === "No egg" && !dish.allergens.includes("Egg"));
      return matchesQuery && matchesCuisine && matchesMeal && matchesTime && matchesDietary;
    });

    return [...results].sort((a, b) => {
      if (sort === "Fastest") return a.minutes - b.minutes;
      if (sort === "Highest rated") return Number(b.rating) - Number(a.rating);
      if (sort === "Most reviewed") return reviewCount(b.reviews) - reviewCount(a.reviews);
      return Number(b.verified) - Number(a.verified) || Number(b.rating) - Number(a.rating);
    });
  }, [cuisine, dietary, mealType, query, sort, time]);

  const hasFilters = cuisine !== ALL || mealType !== ALL || time !== ALL || dietary !== ALL;
  function resetFilters() {
    setCuisine(ALL);
    setMealType(ALL);
    setTime(ALL);
    setDietary(ALL);
    setSort("Recommended");
  }

  return (
    <section className="section-shell editorial-finder" aria-labelledby="editorial-finder-title">
      <div className="section-heading">
        <div>
          <span className="kicker"><i /> Savora tested collection</span>
          <h2 id="editorial-finder-title">Find a recipe for the way you cook today</h2>
        </div>
        <p>Every result includes timing, a defining technique, cultural context, and Cook Mode.</p>
      </div>

      <div className="discovery-layout">
        <aside className="facet-panel" aria-label="Recipe filters">
          <div><strong>Refine recipes</strong>{hasFilters ? <button type="button" onClick={resetFilters}>Clear all</button> : null}</div>
          <label className="facet-field"><span>Cuisine</span><select value={cuisine} onChange={(event) => setCuisine(event.target.value)}>{cuisines.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="facet-field"><span>Meal type</span><select value={mealType} onChange={(event) => setMealType(event.target.value)}>{mealTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="facet-field"><span>Maximum time</span><select value={time} onChange={(event) => setTime(event.target.value)}><option value={ALL}>{ALL}</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="120">2 hours</option></select></label>
          <label className="facet-field"><span>Dietary filter</span><select value={dietary} onChange={(event) => setDietary(event.target.value)}><option value={ALL}>{ALL}</option><option value="No dairy">No dairy</option><option value="No gluten">No gluten</option><option value="No egg">No egg</option></select></label>
          <p className="facet-safety">Allergen filters use the recipe’s declared profile. Always verify packaged ingredients and cross-contact.</p>
        </aside>

        <div className="editorial-results">
          <div className="result-toolbar">
            <div><strong>{filtered.length} editorial recipes</strong><span>{query ? `Matching “${query}”` : "Reviewed for technique and cultural context"}</span></div>
            <label>Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="Recommended">Recommended</option><option value="Fastest">Fastest</option><option value="Highest rated">Highest rated</option><option value="Most reviewed">Most reviewed</option></select></label>
          </div>
          {filtered.length ? <div className="dish-grid editorial-result-grid">{filtered.map((dish) => <DishCard dish={dish} key={dish.slug} />)}</div> : <div className="empty-state"><span>🍲</span><h3>No editorial recipe matches every filter</h3><p>Clear one filter or continue to the wider global recipe index below.</p><button type="button" onClick={resetFilters}>Reset filters</button></div>}
        </div>
      </div>
    </section>
  );
}
