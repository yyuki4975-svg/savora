"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useMemo, useState, type CSSProperties } from "react";
import type { PublishedMapCountry, PublishedMapPlace, PublishedMapRecipe } from "../../lib/api/published-map";
import { countryRegionOrder } from "../../lib/geo/country-geo";
import { Footer, Header } from "../ui";
import { SavoraLogoMark } from "../savora-logo";
import { MapCanvas, type MapSelection } from "./map-canvas";
import styles from "./world-map-passed-bowl.module.css";
import { useWebsiteCopy } from "../use-website-copy";
import { localImage } from "../../lib/media/local-media";

const countryExhibitions = [
  {
    slug: "spain",
    country: "Spain",
    title: "A table shaped by many landscapes.",
    copy: "Follow olive groves, rice wetlands, fishing ports, markets, and family notebooks through a many-voiced food culture.",
    image: "https://upload.wikimedia.org/wikipedia/commons/e/ed/01_Paella_Valenciana_original.jpg",
    alt: "Traditional Paella Valenciana in a wide shallow pan.",
    tone: "sun",
  },
  {
    slug: "france",
    country: "France",
    title: "Read daily life through bread.",
    copy: "Move from grain and fermentation to trained hands, neighborhood bakeries, and the ritual of carrying home a fresh loaf.",
    image: "https://commons.wikimedia.org/wiki/Special:Redirect/file/French_bakery_bread_(43991934612).jpg",
    alt: "Baguettes and loaves arranged in a French bakery.",
    tone: "wheat",
  },
  {
    slug: "japan",
    country: "Japan",
    title: "Season, makers, and the careful table.",
    copy: "Meet growers, fishers, fermenters, market workers, and cooks behind familiar dishes and precise everyday rituals.",
    image: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Japan,_rice_harvesting.jpg",
    alt: "Rice being harvested in Japan.",
    tone: "rice",
  },
  {
    slug: "mexico",
    country: "Mexico",
    title: "Where the milpa becomes a meal.",
    copy: "Trace maize, beans, squash, chile, stone, fire, markets, and shared labor beyond the shorthand of a single dish.",
    image: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Milpa_in_Zaragoza,_Tilantongo.jpg",
    alt: "A milpa field growing maize, beans, and squash in Oaxaca, Mexico.",
    tone: "maize",
  },
] as const;

function RecipeLines({ recipes }: { recipes: PublishedMapRecipe[] }) {
  if (!recipes.length) return null;
  return (
    <ul className={styles.placeRecipes}>
      {recipes.map((recipe) => (
        <li key={recipe.slug}><Link href={`/recipes/${recipe.slug}`}><strong>{recipe.title}</strong>{recipe.totalMinutes ? <small>{`${recipe.totalMinutes} min`}</small> : null}</Link></li>
      ))}
    </ul>
  );
}

function FeatureRecipe({ recipe }: { recipe: PublishedMapRecipe | undefined }) {
  if (!recipe) return null;
  return (
    <Link className={styles.placeFeature} href={`/recipes/${recipe.slug}`}>
      <span className={styles.placeFeatureImage}><Image src={recipe.image} alt={recipe.alt || recipe.title} fill sizes="(max-width: 980px) 92vw, 420px" /></span>
      <span className={styles.placeFeatureCopy}><small>{[recipe.category, recipe.totalMinutes ? `${recipe.totalMinutes} min` : null].filter(Boolean).join(" · ")}</small><strong>{recipe.title}</strong></span>
    </Link>
  );
}

export function WorldMapExperience({ places, countries }: { places: PublishedMapPlace[]; countries: PublishedMapCountry[] }) {
  const copy = useWebsiteCopy();
  const [mode, setMode] = useState<"map" | "directory">("map");
  // Start on the whole world; the place panel opens once a country or city is chosen.
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [spin, setSpin] = useState(0);
  const select = useCallback((next: MapSelection) => setSelection(next), []);

  const mappedRecipes = useMemo(() => countries.reduce((total, country) => total + country.recipeCount, 0), [countries]);
  const regions = useMemo(() => countryRegionOrder
    .map((region) => ({ region, countries: countries.filter((country) => country.region === region) }))
    .filter((group) => group.countries.length), [countries]);

  const selectedCountry = selection?.kind === "country" ? countries.find((country) => country.slug === selection.slug) : undefined;
  const selected = selection?.kind === "place" ? places.find((place) => place.slug === selection.slug) : undefined;
  const parentCountry = selected ? countries.find((country) => country.slug === selected.countrySlug) : undefined;
  const exhibitionFor = (name: string | undefined) => countryExhibitions.find((exhibition) => exhibition.country === name);

  function scrollToAtlas() {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("atlas")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  function choose(next: MapSelection, scroll = false) {
    setSelection(next);
    if (scroll) scrollToAtlas();
  }

  function surpriseMe() {
    // Never land on what is already open, so the button always moves somewhere new.
    const options: MapSelection[] = [...places.map((place) => ({ kind: "place" as const, slug: place.slug })), ...countries.map((country) => ({ kind: "country" as const, slug: country.slug }))]
      .filter((option) => option.kind !== selection?.kind || option.slug !== selection?.slug);
    const next = options[Math.floor(Math.random() * options.length)];
    if (!next) return;
    setSpin((value) => value + 1);
    choose(next, true);
  }

  return (
    <main className={styles.page} data-catalog-source="api" data-website-page>
      <Header />

      <section className={styles.stage} id="atlas" aria-labelledby="world-map-title" data-panel={selection ? "open" : "closed"}>
        <MapCanvas places={places} countries={countries} selection={selection} onSelect={select} />
        <div className={styles.introCard}>
          <h1 id="world-map-title" translate="no">{copy("Taste has a place.", { heading: true })}</h1>
          <div className={styles.introText}>
            <p>Choose a country, arrive in a city, and meet the dishes that belong to its streets, markets, and tables.</p>
            <p className={styles.statLine}>{`${countries.length} countries · ${places.length} cities · ${mappedRecipes.toLocaleString("en")} recipes`}</p>
          </div>
          <button className={styles.surprise} type="button" onClick={surpriseMe}>
            <SavoraLogoMark className={styles.surpriseMark} key={spin} />
            <span>Surprise me</span>
          </button>
        </div>
          {selectedCountry ? (
            <aside className={styles.placePanel} aria-live="polite" key={`country-${selectedCountry.slug}`}>
              <button className={styles.closePanel} type="button" aria-label="Close" onClick={() => setSelection(null)}>×</button>
              <FeatureRecipe recipe={selectedCountry.recipes[0]} />
              <div className={styles.placeBody}>
                <p className={styles.placeCountry}><span aria-hidden="true">{selectedCountry.flag}</span> {selectedCountry.region}</p>
                <h3>{selectedCountry.name}</h3>
                <p className={styles.countryCount}>{`${selectedCountry.recipeCount} published recipes`}</p>
                {selectedCountry.categories.length ? <ul className={styles.categoryChips} aria-label="Most common menus">{selectedCountry.categories.map((category) => <li key={category}>{category}</li>)}</ul> : null}
                <RecipeLines recipes={selectedCountry.recipes.slice(1)} />
                {selectedCountry.placeSlugs.length ? (
                  <div className={styles.cityChips}>
                    <span>Cities on the map</span>
                    {selectedCountry.placeSlugs.map((slug) => { const place = places.find((item) => item.slug === slug); return place ? <button type="button" key={slug} onClick={() => choose({ kind: "place", slug })}>{place.name}</button> : null; })}
                  </div>
                ) : null}
                <div className={styles.panelLinks}>
                  <Link className={styles.placeLink} href={`/explore?country=${selectedCountry.slug}#explore-controls`}>{`See all ${selectedCountry.recipeCount} in Explore`} <span aria-hidden="true">→</span></Link>
                  {exhibitionFor(selectedCountry.name) ? <Link data-website-localized className={styles.placeLink} href={`/stories/regions/${exhibitionFor(selectedCountry.name)!.slug}`}>{copy(`Enter the ${selectedCountry.name} exhibition`)} <span aria-hidden="true">→</span></Link> : null}
                </div>
              </div>
            </aside>
          ) : selected ? (
            <aside className={styles.placePanel} aria-live="polite" key={`place-${selected.slug}`}>
              <button className={styles.closePanel} type="button" aria-label="Close" onClick={() => setSelection(null)}>×</button>
              <FeatureRecipe recipe={selected.recipes[0]} />
              <div className={styles.placeBody}>
                <p className={styles.placeCountry}><span aria-hidden="true">{selected.flag}</span> {parentCountry ? <button type="button" className={styles.backToCountry} onClick={() => choose({ kind: "country", slug: parentCountry.slug })}>{selected.country}</button> : selected.country}</p>
                <h3>{selected.name}</h3>
                <p>{selected.note}</p>
                <RecipeLines recipes={selected.recipes.slice(1, 4)} />
                <div className={styles.panelLinks}>
                  <Link data-website-localized className={styles.placeLink} href={`/places/${selected.slug}`}>{copy(`Open the ${selected.name} place guide`)}{selected.recipes.length > 4 ? ` · ${copy(`${selected.recipes.length - 4} more recipes`)}` : ""} <span aria-hidden="true">→</span></Link>
                </div>
              </div>
            </aside>
          ) : null}
      </section>

      <section className={styles.atlasSection} aria-labelledby="atlas-title">
        <div className={styles.atlasInner}>
          <header className={styles.atlasHeader}>
            <h2 id="atlas-title">The living atlas</h2>
            <div className={styles.atlasControls}>
              <label><span>Country</span>
                <select value={selectedCountry?.slug ?? parentCountry?.slug ?? ""} onChange={(event) => event.target.value && choose({ kind: "country", slug: event.target.value }, true)}>
                  <option value="">All</option>
                  {countries.map((item) => <option key={item.slug} value={item.slug}>{`${item.name} (${item.recipeCount})`}</option>)}
                </select>
              </label>
              <div role="group" aria-label="Atlas view">
                <button type="button" aria-pressed={mode === "map"} onClick={() => setMode("map")}>Countries</button>
                <button type="button" aria-pressed={mode === "directory"} onClick={() => setMode("directory")}>City directory</button>
              </div>
            </div>
          </header>

          {mode === "map" ? (
            <nav className={styles.placeIndex} aria-labelledby="atlas-title">
              <div className={styles.regionColumns}>
                {regions.map(({ region, countries: regionCountries }) => (
                  <section key={region} aria-labelledby={`map-region-${region}`}>
                    <h4 id={`map-region-${region}`}>{region}</h4>
                    <ul>
                      {regionCountries.map((country) => (
                        <li key={country.slug}>
                          <button type="button" aria-pressed={selection?.kind === "country" && selection.slug === country.slug} onClick={() => choose({ kind: "country", slug: country.slug }, true)}>
                            <span>{country.name}</span><small>{country.recipeCount}</small>
                          </button>
                          {country.placeSlugs.length ? <span className={styles.indexCities}>{country.placeSlugs.map((slug) => { const place = places.find((item) => item.slug === slug); return place ? <button type="button" key={slug} aria-pressed={selection?.kind === "place" && selection.slug === slug} onClick={() => choose({ kind: "place", slug }, true)}>{place.name}</button> : null; })}</span> : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </nav>
          ) : (
            <ol className={styles.cityDirectory}>
              {places.map((place) => (
                <li key={place.slug}>
                  <button type="button" onClick={() => choose({ kind: "place", slug: place.slug }, true)}>
                    <span><small>{place.country}</small><strong>{place.name}</strong></span>
                    <em>{place.recipes.length} {place.recipes.length === 1 ? "recipe" : "recipes"}</em>
                  </button>
                  <div>{place.recipes.map((recipe) => <Link href={`/recipes/${recipe.slug}`} key={recipe.slug}>{recipe.title}</Link>)}</div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      <section className={styles.exhibitionsSection} id="country-exhibitions" aria-labelledby="country-exhibitions-title">
        <header className={styles.exhibitionsIntro}>
          <h2 id="country-exhibitions-title">Stay longer than a map pin.</h2>
          <p>Four exhibitions connect food to landscape, memory, craft, and daily life.</p>
        </header>
        <div className={styles.exhibitionList}>
          {countryExhibitions.map((exhibition, index) => (
            <article key={exhibition.slug} data-tone={exhibition.tone} style={{ "--i": index } as CSSProperties}>
              <Link href={`/stories/regions/${exhibition.slug}`} className={styles.exhibitionImage}>
                <Image src={localImage(exhibition.image)} alt={exhibition.alt} fill sizes="(max-width: 760px) 100vw, 50vw" />
              </Link>
              <div>
                <small>{exhibition.country}</small>
                <h3>{exhibition.title}</h3>
                <p>{exhibition.copy}</p>
                <Link data-website-localized href={`/stories/regions/${exhibition.slug}`}>{copy(`Enter the ${exhibition.country} exhibition`)} <span aria-hidden="true">→</span></Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </main>
  );
}
