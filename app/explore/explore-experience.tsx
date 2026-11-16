import Image from "next/image";
import NextLink from "next/link";
import type { ComponentProps, CSSProperties } from "react";
import { Footer, Header } from "../ui";
import {
  loadPublishedDiscoveryCatalog,
  type DiscoveryRecipe,
} from "../../lib/api/published-discovery";
import { loadLocalizedSearchText } from "../../lib/api/published-discovery-search";
import { matchesSearch, normalizeSearchText, recipeMatchesIngredientFacet, searchRank, searchTokens } from "../../lib/explore-search";
import { FoodCultureColumn } from "./food-culture-column";
import { ExploreFilters } from "./explore-filters";
import { ExploreTitle } from "./explore-title";
import { RecipeSaveButton } from "../recipe-save-button";
import styles from "./explore-passed-bowl.module.css";
import { menuCategories } from "../../lib/recipe-menu";
import { responsiveFillSourceSet } from "../../lib/images/responsive-fill.mjs";
import { intentSignals, recipeSignals, smartSearch, type SearchableRecipe } from "../../lib/search/smart-search";
import { ForYouRail, SearchUnderstanding, TasteRecorder, type RailRecipe } from "./search-assist";
import { SearchSuggestInput } from "../search-suggest";
import { ErrorScene } from "../error-scene";

// A dense filter/card grid must not compete with the user's chosen navigation.
// Keep Next's normal links, history, focus and SPA transitions; load on click.
// https://nextjs.org/docs/app/api-reference/components/link#prefetch
function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink {...props} prefetch={props.rel === "next"} />;
}

type SearchValue = string | string[] | undefined;
export type ExploreQuery = {
  q?: SearchValue;
  ingredient?: SearchValue;
  country?: SearchValue;
  place?: SearchValue;
  page?: SearchValue;
  category?: SearchValue;
  time?: SearchValue;
  sort?: SearchValue;
  exact?: SearchValue;
};

const ingredientDefinitions = [
  { slug: "tomato", label: "Tomato", description: "Bright, slow-cooked, sun-warmed", terms: ["tomato"], tone: styles.tomato },
  { slug: "rice", label: "Rice", description: "Bowls, pans, fields, and feasts", terms: ["rice"], tone: styles.saffron },
  { slug: "chile", label: "Chile & pepper", description: "Heat with a sense of place", terms: ["chile", "chili", "pepper", "gochujang"], tone: styles.chile },
  { slug: "eggplant", label: "Eggplant", description: "Silky, smoky, and generous", terms: ["eggplant", "aubergine"], tone: styles.aubergine },
  { slug: "citrus", label: "Citrus", description: "Lemon, orange, and preserved peel", terms: ["lemon", "orange", "lime"], tone: styles.citrus },
  { slug: "coconut", label: "Coconut", description: "Creamy curries and long simmers", terms: ["coconut"], tone: styles.coconut },
  { slug: "fish", label: "Fish", description: "Coasts, rivers, steam, and fire", terms: ["fish", "salmon", "cod", "tilapia"], tone: styles.sea },
  { slug: "herbs", label: "Fresh herbs", description: "Fragrant finishes and green notes", terms: ["herb", "parsley", "basil", "cilantro", "scallion"], tone: styles.herb },
] as const;

// Colour dots in the ingredient filter, matching the ingredient route tiles.
const ingredientTones: Record<string, string> = {
  tomato: "var(--sv-clay)", rice: "var(--sv-honey)", chile: "var(--sv-chile)", eggplant: "#6c4d68",
  citrus: "#e7bc4a", coconut: "var(--sv-earth)", fish: "#3f6f73", herbs: "var(--sv-moss)",
};

// Only recipes with a recorded preparation and cooking time can match a time limit.
const timeLimits = [
  { slug: "30", label: "30 minutes or less", minutes: 30 },
  { slug: "60", label: "60 minutes or less", minutes: 60 },
] as const;

const sortOrders = [
  { slug: "", label: "Photographed first" },
  { slug: "quick", label: "Quickest first" },
] as const;

// Editorial grouping for the place index. Countries not listed fall into "More places".
const regionOrder = ["Europe", "Middle East", "Africa", "Asia", "The Americas", "Oceania", "More places"] as const;
type Region = (typeof regionOrder)[number];
const countryRegions: Record<string, Region> = {
  croatia: "Europe", france: "Europe", greece: "Europe", ireland: "Europe", italy: "Europe", netherlands: "Europe",
  norway: "Europe", poland: "Europe", portugal: "Europe", russia: "Europe", slovakia: "Europe", spain: "Europe",
  ukraine: "Europe", "united-kingdom": "Europe", austria: "Europe", sweden: "Europe", albania: "Europe", germany: "Europe", czechia: "Europe", denmark: "Europe", switzerland: "Europe", malta: "Europe", romania: "Europe",
  "saudi-arabia": "Middle East", syria: "Middle East", turkiye: "Middle East", yemen: "Middle East", "t-rkiye": "Middle East", turkey: "Middle East", lebanon: "Middle East", iran: "Middle East",
  algeria: "Africa", egypt: "Africa", kenya: "Africa", morocco: "Africa", tunisia: "Africa", nigeria: "Africa", ethiopia: "Africa", ghana: "Africa", "south-africa": "Africa", libya: "Africa", senegal: "Africa",
  china: "Asia", india: "Asia", indonesia: "Asia", japan: "Asia", malaysia: "Asia", philippines: "Asia", "south-korea": "Asia",
  thailand: "Asia", vietnam: "Asia", bangladesh: "Asia",
  argentina: "The Americas", brazil: "The Americas", canada: "The Americas", jamaica: "The Americas", mexico: "The Americas",
  "united-states": "The Americas", uruguay: "The Americas", venezuela: "The Americas", peru: "The Americas", colombia: "The Americas", "dominican-republic": "The Americas",
  australia: "Oceania", "new-zealand": "Oceania",
};

type IngredientDefinition = (typeof ingredientDefinitions)[number];

type CountryFacet = {
  slug: string;
  name: string;
  count: number;
};

type FilterState = {
  search: string;
  ingredient: string;
  country: string;
  category: string;
  time: string;
  sort: string;
};

function firstValue(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

const facetMatch = (facet: string, ingredients: readonly string[]) => recipeMatchesIngredientFacet(facet, ingredients);
type Searchable = SearchableRecipe & { recipe: DiscoveryRecipe };
function toSearchable(recipe: DiscoveryRecipe, localized?: string): Searchable {
  return { slug: recipe.slug, title: recipe.title, ingredients: recipe.ingredients, menuCategories: recipe.menuCategories, countrySlug: recipe.countrySlug,
    country: recipe.country, place: recipe.place, totalMinutes: recipe.totalMinutes, text: recipe.keywords.join(" "), localized, recipe };
}

// A broad, photographed sample for the "Picked for you" rail: round-robin across countries.
function diversePool(recipes: readonly DiscoveryRecipe[], size: number) {
  const byCountry = new Map<string, DiscoveryRecipe[]>();
  for (const recipe of recipes) if (recipe.hasPhotography) byCountry.set(recipe.countrySlug, [...(byCountry.get(recipe.countrySlug) ?? []), recipe]);
  const lists = [...byCountry.values()];
  const pool: DiscoveryRecipe[] = [];
  for (let round = 0; pool.length < size && lists.some((list) => list.length > round); round++) for (const list of lists) if (list[round] && pool.length < size) pool.push(list[round]);
  return pool;
}

function recipeMatchesIngredient(recipe: DiscoveryRecipe, facet: IngredientDefinition) {
  return recipeMatchesIngredientFacet(facet.slug, recipe.ingredients);
}

function filterUrl(basePath: string, state: FilterState, change: Partial<FilterState> = {}, page = 1) {
  const next = { ...state, ...change };
  const query = new URLSearchParams();
  if (next.search) query.set("q", next.search);
  if (next.ingredient) query.set("ingredient", next.ingredient);
  if (next.country) query.set("country", next.country);
  if (next.category) query.set("category", next.category);
  if (next.time) query.set("time", next.time);
  if (next.sort) query.set("sort", next.sort);
  if (page > 1) query.set("page", String(page));
  const suffix = query.toString();
  return `${basePath}${suffix ? `?${suffix}` : ""}`;
}

function recipeMeta(recipe: DiscoveryRecipe) {
  // "General" is the catalogue's no-origin bucket; it is not a place, so it is not shown as one.
  const place = recipe.place || (recipe.countrySlug === "general" ? null : recipe.country);
  return [place, recipe.totalMinutes ? `${recipe.totalMinutes} min` : null, recipe.sourceName].filter(Boolean).join(" · ");
}

function StatePanel({ title, copy }: { title: string; copy: string }) {
  return <main className={styles.page} data-website-page><Header /><ErrorScene kind="unavailable" title={title} message={copy} /><Footer /></main>;
}

export async function ExploreExperience({
  query,
  basePath,
  preview = false,
}: {
  query: ExploreQuery;
  basePath: "/explore" | "/phase-3/explore-preview";
  storyPath: "/stories/paella-valenciana" | "/phase-3/story-preview/paella-valenciana";
  preview?: boolean;
}) {
  const requestedSearch = firstValue(query.q);
  const search = typeof requestedSearch === "string" ? requestedSearch.trim().slice(0, 100) : "";
  const [result, localizedText] = await Promise.all([
    loadPublishedDiscoveryCatalog(),
    search ? loadLocalizedSearchText().catch(() => new Map<string, string>()) : Promise.resolve(new Map<string, string>()),
  ]);

  if (result.status === "error") return <StatePanel title="The archive is taking a short pause." copy={result.message} />;
  if (result.status === "empty") return <StatePanel title="The table is still being set." copy="Published recipes will appear here as soon as they are ready." />;

  const { recipes } = result;
  const ingredientFacets = ingredientDefinitions.map((definition) => ({
    ...definition,
    count: recipes.filter((recipe) => recipeMatchesIngredient(recipe, definition)).length,
  })).filter((facet) => facet.count > 0);

  const countryMap = new Map<string, CountryFacet>();
  recipes.forEach((recipe) => {
    const current = countryMap.get(recipe.countrySlug);
    if (current) current.count += 1;
    else countryMap.set(recipe.countrySlug, { slug: recipe.countrySlug, name: recipe.country, count: 1 });
  });
  const countryFacets = Array.from(countryMap.values()).sort((left, right) => {
    if (left.slug === "general") return 1;
    if (right.slug === "general") return -1;
    return left.name.localeCompare(right.name);
  });

  // Query values are untrusted. Only values present in the server-derived allowlists become active filters.
  const requestedIngredient = firstValue(query.ingredient);
  const requestedCountry = firstValue(query.country) ?? firstValue(query.place);
  const searchWords = searchTokens(search);
  const activeIngredient = ingredientFacets.find((facet) => facet.slug === requestedIngredient) ?? null;
  const activeCountry = countryFacets.find((facet) => facet.slug === requestedCountry) ?? null;
  const requestedCategory = firstValue(query.category);
  const categoryFacets = menuCategories.map(c => ({ ...c, count: recipes.filter(r => r.menuCategories.includes(c.slug)).length }));
  const activeCategory = categoryFacets.find(c => c.slug === requestedCategory) ?? null;
  const requestedTime = firstValue(query.time);
  const activeTime = timeLimits.find((limit) => limit.slug === requestedTime) ?? null;
  const requestedSort = firstValue(query.sort);
  const activeSort = sortOrders.find((order) => order.slug === requestedSort && order.slug) ?? sortOrders[0];

  const state: FilterState = {
    search,
    ingredient: activeIngredient?.slug ?? "",
    country: activeCountry?.slug ?? "",
    category: activeCategory?.slug ?? "",
    time: activeTime?.slug ?? "",
    sort: activeSort.slug,
  };

  const haystacks = new Map<string, string>();
  const searchHaystack = (recipe: DiscoveryRecipe) => {
    let value = haystacks.get(recipe.slug);
    if (value === undefined) {
      value = `${normalizeSearchText(recipe.keywords.join(" "))} ${localizedText.get(recipe.slug) ?? ""}`;
      haystacks.set(recipe.slug, value);
    }
    return value;
  };

  // Smart search reads intents, fixes spelling and ranks by relevance; ?exact=1 keeps the literal search.
  const exact = firstValue(query.exact) === "1";
  const outcome = search && !exact ? smartSearch(recipes.map((recipe) => toSearchable(recipe, localizedText.get(recipe.slug))), search, facetMatch) : null;
  const searchPool = outcome ? outcome.results.map((item) => item.recipe) : recipes;
  const filteredRecipes = searchPool.filter((recipe) => {
    if (searchWords.length && exact && !matchesSearch(searchHaystack(recipe), searchWords)) return false;
    if (activeIngredient && !recipeMatchesIngredient(recipe, activeIngredient)) return false;
    if (activeCountry && recipe.countrySlug !== activeCountry.slug) return false;
    if (activeCategory && !recipe.menuCategories.includes(activeCategory.slug)) return false;
    if (activeTime && (recipe.totalMinutes === null || recipe.totalMinutes > activeTime.minutes)) return false;
    return true;
  });
  // While searching, dishes whose title carries every word come first (stable otherwise).
  if (searchWords.length && exact && activeSort.slug !== "quick") {
    const rank = new Map(filteredRecipes.map((recipe) => [recipe.slug, searchRank(recipe.title, searchWords)]));
    filteredRecipes.sort((left, right) => rank.get(left.slug)! - rank.get(right.slug)!);
  }
  if (activeSort.slug === "quick") {
    // Stable: recipes without a recorded time keep their catalogue order after the timed ones.
    filteredRecipes.sort((left, right) => (left.totalMinutes ?? Infinity) - (right.totalMinutes ?? Infinity));
  }
  const timeCounts = Object.fromEntries(timeLimits.map((limit) => [limit.slug, recipes.filter((recipe) => recipe.totalMinutes !== null && recipe.totalMinutes <= limit.minutes).length]));

  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(filteredRecipes.length / pageSize));
  const requestedPage = firstValue(query.page);
  const parsedPage = requestedPage && /^[1-9][0-9]{0,2}$/.test(requestedPage) ? Number(requestedPage) : 1;
  const currentPage = parsedPage <= pageCount ? parsedPage : 1;
  const invalidPage = requestedPage !== undefined && requestedPage !== String(currentPage);
  const visibleRecipes = filteredRecipes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const pageUrl = (page: number) => `${filterUrl(basePath, state, {}, page)}#explore-controls`;
  const pageGroupStart = Math.floor((currentPage - 1) / 10) * 10 + 1;
  const pageGroupEnd = Math.min(pageCount, pageGroupStart + 9);
  const visiblePageNumbers = Array.from(
    { length: pageGroupEnd - pageGroupStart + 1 },
    (_, index) => pageGroupStart + index,
  );
  const visibleCountries = countryFacets.filter((facet) => facet.slug !== "general");
  const regions = regionOrder
    .map((region) => ({ region, countries: visibleCountries.filter((country) => (countryRegions[country.slug] ?? "More places") === region) }))
    .filter((group) => group.countries.length);
  const activeFilterCount = [search, activeIngredient, activeCountry, activeCategory, activeTime].filter(Boolean).length;
  const menuShortcuts = [...categoryFacets].filter((category) => category.count > 0).sort((left, right) => right.count - left.count).slice(0, 8);
  // On-device recommendations: a pool beyond the first page of results (or a broad sample), with coarse signals.
  const railSource = activeFilterCount ? filteredRecipes.slice(pageSize, pageSize + 120).filter((recipe) => recipe.hasPhotography) : diversePool(recipes, 160);
  const railPool: RailRecipe[] = currentPage === 1 ? railSource.map((recipe) => ({ slug: recipe.slug, title: recipe.title, image: recipe.image, alt: recipe.alt,
    meta: [recipe.place ?? (recipe.country !== "General" ? recipe.country : null), recipe.totalMinutes ? `${recipe.totalMinutes} min` : null].filter(Boolean).join(" · "),
    signals: recipeSignals(toSearchable(recipe), facetMatch) })) : [];
  // What this visit says about taste: read intents, chosen filters, and kinds shared by the top results.
  const topSignals = (() => {
    if (!search || !filteredRecipes.length) return [];
    const counts = new Map<string, number>();
    for (const recipe of filteredRecipes.slice(0, 5)) for (const signal of recipeSignals(toSearchable(recipe), facetMatch)) if (!signal.startsWith("diet:")) counts.set(signal, (counts.get(signal) ?? 0) + 1);
    return [...counts].filter(([, count]) => count >= 3).map(([signal]) => signal);
  })();
  const tasteSignals = [...new Set([...(outcome ? intentSignals(outcome.intents) : []), ...topSignals,
    ...(activeCategory ? [`menu:${activeCategory.slug}`] : []), ...(activeIngredient ? [`ing:${activeIngredient.slug}`] : []), ...(activeCountry ? [`country:${activeCountry.slug}`] : [])])];
  const invalidFilter = (requestedIngredient && !activeIngredient) || (requestedCountry && !activeCountry) || (requestedCategory && !activeCategory) || (requestedTime && !activeTime);

  return (
    <main className={styles.page} data-website-page>
      <Header />

      <header className={styles.masthead}>
        <div className={styles.mastheadInner}>
          <div className={styles.title}>
            <ExploreTitle count={recipes.length} />
            <p>A living index of dishes, ingredients, and places—ready for a real kitchen.</p>
          </div>
          <div className={styles.finder}>
            <form className={styles.searchForm} action={`${basePath}#explore-controls`} method="get" role="search">
              <label htmlFor="explore-search">What would you like to cook?</label>
              <div>
                <SearchSuggestInput id="explore-search" defaultValue={search} placeholder="Dish, ingredient, country, or keyword" />
                <button type="submit">Search</button>
              </div>
            </form>
            <nav className={styles.menus} aria-labelledby="menu-shortcuts">
              <h2 id="menu-shortcuts">Browse a menu</h2>
              <ul>
                {menuShortcuts.map((category) => (
                  <li key={category.slug}>
                    <Link href={`${filterUrl(basePath, state, { category: category.slug })}#explore-controls`} aria-current={activeCategory?.slug === category.slug ? "page" : undefined}>
                      {category.label} <small>({category.count})</small>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </header>

      <section className={styles.ingredientRoutes} aria-labelledby="ingredients-title">
        <header>
          <h2 id="ingredients-title">Begin with an ingredient</h2>
          <p>Eight familiar staples open eight different routes through the archive.</p>
        </header>
        <div className={styles.ingredientGrid}>
          {ingredientFacets.map((facet, index) => (
            <Link
              className={`${styles.ingredientCard} ${facet.tone}`}
              href={`${filterUrl(basePath, state, { ingredient: activeIngredient?.slug === facet.slug ? "" : facet.slug })}#explore-controls`}
              aria-current={activeIngredient?.slug === facet.slug ? "page" : undefined}
              style={{ "--i": index } as CSSProperties}
              key={facet.slug}
            >
              <strong>{facet.label}</strong>
              <span className={styles.ingredientNote}>{facet.description}</span>
              <small>{`${facet.count} recipes`}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.results} id="explore-controls" aria-labelledby="results-title">
        <div className={styles.toolbar}>
          <ExploreFilters
            total={pageCount > 1 ? `${filteredRecipes.length.toLocaleString("en")} recipes · Page ${currentPage} of ${pageCount}` : `${filteredRecipes.length.toLocaleString("en")} recipes`}
            groups={[
              {
                id: "category", label: "Menu", current: activeCategory?.label ?? "All menus", active: Boolean(activeCategory),
                options: [{ label: "All menus", href: `${filterUrl(basePath, state, { category: "" })}#explore-controls`, active: !activeCategory },
                  ...categoryFacets.filter((category) => category.count > 0).map((category) => ({ label: category.label, count: category.count, href: `${filterUrl(basePath, state, { category: category.slug })}#explore-controls`, active: activeCategory?.slug === category.slug }))],
              },
              {
                id: "ingredient", label: "Ingredient", current: activeIngredient?.label ?? "Every ingredient", active: Boolean(activeIngredient),
                options: [{ label: "Every ingredient", href: `${filterUrl(basePath, state, { ingredient: "" })}#explore-controls`, active: !activeIngredient },
                  ...ingredientFacets.map((facet) => ({ label: facet.label, count: facet.count, tone: ingredientTones[facet.slug], href: `${filterUrl(basePath, state, { ingredient: facet.slug })}#explore-controls`, active: activeIngredient?.slug === facet.slug }))],
              },
              {
                id: "country", label: "Country", current: activeCountry?.name ?? "Every country", active: Boolean(activeCountry), searchable: true,
                options: [{ label: "Every country", href: `${filterUrl(basePath, state, { country: "" })}#explore-controls`, active: !activeCountry },
                  ...countryFacets.map((country) => ({ label: country.name, count: country.count, href: `${filterUrl(basePath, state, { country: country.slug })}#explore-controls`, active: activeCountry?.slug === country.slug }))],
              },
              {
                id: "time", label: "Time", current: activeTime?.label ?? "Any time", active: Boolean(activeTime),
                options: [{ label: "Any time", href: `${filterUrl(basePath, state, { time: "" })}#explore-controls`, active: !activeTime },
                  ...timeLimits.map((limit) => ({ label: limit.label, count: timeCounts[limit.slug], href: `${filterUrl(basePath, state, { time: limit.slug })}#explore-controls`, active: activeTime?.slug === limit.slug }))],
              },
            ]}
            sort={sortOrders.map((order) => ({ label: order.label, href: `${filterUrl(basePath, state, { sort: order.slug })}#explore-controls`, active: activeSort.slug === order.slug }))}
            chips={[
              ...(search ? [{ label: `Search: ${search}`, ariaLabel: `Remove search ${search}`, href: `${filterUrl(basePath, state, { search: "" })}#explore-controls` }] : []),
              ...(activeCategory ? [{ label: activeCategory.label, ariaLabel: `Remove menu filter ${activeCategory.label}`, href: `${filterUrl(basePath, state, { category: "" })}#explore-controls` }] : []),
              ...(activeIngredient ? [{ label: activeIngredient.label, ariaLabel: `Remove ingredient filter ${activeIngredient.label}`, href: `${filterUrl(basePath, state, { ingredient: "" })}#explore-controls` }] : []),
              ...(activeCountry ? [{ label: activeCountry.name, ariaLabel: `Remove country filter ${activeCountry.name}`, href: `${filterUrl(basePath, state, { country: "" })}#explore-controls` }] : []),
              ...(activeTime ? [{ label: activeTime.label, ariaLabel: `Remove time filter ${activeTime.label}`, href: `${filterUrl(basePath, state, { time: "" })}#explore-controls` }] : []),
            ]}
            clearHref={`${filterUrl(basePath, { search: "", ingredient: "", country: "", category: "", time: "", sort: state.sort })}#explore-controls`}
          />
        </div>

        <div className={styles.resultsInner}>
          <div className={styles.resultHeader}>
            <h2 id="results-title">{activeFilterCount ? "Matching recipes" : "All recipes"}</h2>
            <p>{pageCount > 1 ? `${filteredRecipes.length.toLocaleString("en")} recipes · Page ${currentPage} of ${pageCount}` : `${filteredRecipes.length.toLocaleString("en")} recipes`}</p>
          </div>

          {invalidFilter ? <p className={styles.invalidNotice}>That filter is not in the published archive, so it was ignored.</p> : null}
          {invalidPage ? <p className={styles.invalidNotice}>That page is unavailable. Showing the first page instead.</p> : null}
          {activeTime ? <p className={styles.timeNote}>Only recipes with a recorded preparation and cooking time are included.</p> : null}

          {outcome ? <SearchUnderstanding intentIds={outcome.intents.map((intent) => intent.id)} corrections={outcome.corrections} relaxed={outcome.relaxed} exactHref={`${filterUrl(basePath, state)}&exact=1#explore-controls`} /> : null}
          {tasteSignals.length ? <TasteRecorder signals={tasteSignals} weight={1} once={`explore:${search}|${state.category}|${state.ingredient}|${state.country}`} /> : null}
          {filteredRecipes.length ? (
            <>
              <div className={styles.resultGrid}>
                {visibleRecipes.map((recipe, index) => (
                  <article className={index === 0 ? styles.featureCard : styles.card} style={{ "--i": index } as CSSProperties} key={recipe.slug}>
                    <Link href={`/recipes/${recipe.slug}`}>
                      <span className={styles.resultImage}>
                        <Image src={recipe.image} alt={recipe.alt} fill sizes={index === 0 ? "(max-width: 820px) 92vw, 62vw" : "(max-width: 560px) 92vw, (max-width: 1050px) 45vw, 30vw"} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : undefined} {...responsiveFillSourceSet(recipe.image)} />
                      </span>
                      <span className={styles.resultCopy}>
                        <strong>{recipe.title}</strong>
                        {index === 0 && recipe.summary ? <span className={styles.summary}>{recipe.summary}</span> : null}
                        <small>{recipeMeta(recipe)}</small>
                      </span>
                    </Link>
                    <span className={styles.save}><RecipeSaveButton slug={recipe.slug} name={recipe.title} /></span>
                  </article>
                ))}
              </div>
              {pageCount > 1 ? (
                <nav className={styles.pagination} aria-label="Recipe result pages">
                  <p>{`Showing ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filteredRecipes.length)} of ${filteredRecipes.length}`}</p>
                  <div>{currentPage > 1 ? <Link href={pageUrl(currentPage - 1)} rel="prev">Previous</Link> : null}{pageGroupStart > 1 ? <Link href={pageUrl(pageGroupStart - 1)} aria-label={`Previous page group, page ${pageGroupStart - 1}`}>…</Link> : null}{visiblePageNumbers.map((page) => page === currentPage ? <span aria-current="page" key={page}>{page}</span> : <Link href={pageUrl(page)} aria-label={`Page ${page}`} key={page}>{page}</Link>)}{pageGroupEnd < pageCount ? <Link href={pageUrl(pageGroupEnd + 1)} aria-label={`Next page group, page ${pageGroupEnd + 1}`}>…</Link> : null}{currentPage < pageCount ? <Link href={pageUrl(currentPage + 1)} rel="next">Next</Link> : null}</div>
                  <form className={styles.pageJump} action={`${basePath}#explore-controls`} method="get">{search ? <input type="hidden" name="q" value={search} /> : null}{state.ingredient ? <input type="hidden" name="ingredient" value={state.ingredient} /> : null}{state.country ? <input type="hidden" name="country" value={state.country} /> : null}{state.category ? <input type="hidden" name="category" value={state.category} /> : null}{state.time ? <input type="hidden" name="time" value={state.time} /> : null}{state.sort ? <input type="hidden" name="sort" value={state.sort} /> : null}<label htmlFor="recipe-page-jump">Page</label><input id="recipe-page-jump" name="page" type="number" inputMode="numeric" min={1} max={pageCount} defaultValue={currentPage} /><button type="submit">Go</button></form>
                </nav>
              ) : null}
            </>
          ) : (
            <div className={styles.noResults}>
              <h3>No recipes match yet.</h3>
              <p>Remove one filter or try a broader search.</p>
              <div>
                {activeIngredient ? <Link href={filterUrl(basePath, { search, ingredient: activeIngredient.slug, country: "", category: "", time: "", sort: state.sort })}>Keep ingredient only</Link> : null}
                {activeCountry ? <Link href={filterUrl(basePath, { search, ingredient: "", country: activeCountry.slug, category: "", time: "", sort: state.sort })}>Keep country only</Link> : null}
                <Link href={basePath}>Show every recipe</Link>
              </div>
            </div>
          )}
          {/* Recommendations come after the results. */}
          {railPool.length >= 8 ? <ForYouRail pool={railPool} /> : null}
        </div>
      </section>

      <section className={styles.placeBand} id="places" aria-labelledby="places-title">
        <div className={styles.placeInner}>
          <header>
            <h2 id="places-title">Find a table by place</h2>
            <p>Country labels are routes into discovery, not borders around a cuisine.</p>
            <Link className={styles.mapLink} href="/world-map">Open the world map</Link>
          </header>
          <div className={styles.regions}>
            {regions.map(({ region, countries }) => (
              <section aria-labelledby={`region-${region}`} key={region}>
                <h3 id={`region-${region}`}>{region}</h3>
                <ul>
                  {countries.map((country) => (
                    <li key={country.slug}>
                      <Link href={`${filterUrl(basePath, state, { country: country.slug })}#explore-controls`} aria-current={activeCountry?.slug === country.slug ? "page" : undefined}>
                        <span>{country.name}</span><small>{country.count}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </section>
      <FoodCultureColumn basePath={basePath} />

      {preview ? <aside className={styles.reviewBar} aria-label="Phase 3 preview navigation">
        <span>Phase 3 review</span>
        <Link href="/phase-3/catalog-preview">Catalog</Link>
        <Link href="/phase-3/brand-preview">Brand system</Link>
        <Link href="/phase-3/story-preview/paella-valenciana">Story exhibition</Link>
      </aside> : null}

      <Footer />
    </main>
  );
}
