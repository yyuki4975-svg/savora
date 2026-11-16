"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "./i18n";
import { useEnglishSearchQuery } from "./translation-client";

const ALL_CUISINES = "__all_cuisines__";
const ALL_CATEGORIES = "__all_categories__";

type ImportedMeal = {
  id: string;
  name: string;
  area: string;
  category: string;
  image: string;
  source: string;
  taste: string;
  texture: string;
  origin: string;
  flag: string;
  searchText: string;
  sourceUrl: string;
  platform: string;
  social: boolean;
  summary?: string;
  researchPrompt?: string;
  discussion?: Array<{ title: string; body: string }>;
  imageVerified?: boolean;
  imageSubject?: string;
};

type Coverage = {
  maxCuisineCount: number;
  minimumTarget: number;
  balancedCuisineCount: number;
  socialRecipesAdded: number;
  recipeCount?: number;
};

export function ExploreLibrary({ selectedArea, externalQuery, searchVersion }: { selectedArea: string; externalQuery: string; searchVersion: number }) {
  const { locale, t } = useI18n();
  const [meals, setMeals] = useState<ImportedMeal[]>([]);
  const [notes, setNotes] = useState<ImportedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [query, setQuery] = useState("");
  const [area, setArea] = useState(ALL_CUISINES);
  const [category, setCategory] = useState(ALL_CATEGORIES);
  const [visible, setVisible] = useState(24);
  const translatedQuery = useEnglishSearchQuery(query, locale);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/meals", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load meals");
        return response.json() as Promise<{ meals: ImportedMeal[]; notes?: ImportedMeal[]; coverage?: Coverage }>;
      })
      .then((data) => { setMeals(data.meals); setNotes(data.notes ?? []); setCoverage(data.coverage ?? null); })
      .catch((requestError: unknown) => {
        if ((requestError as { name?: string }).name !== "AbortError") setError(true);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let timer = 0;
    if (selectedArea) {
      timer = window.setTimeout(() => {
        setArea(selectedArea);
        setVisible(24);
        document.getElementById("global-explore")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 0);
    }
    return () => window.clearTimeout(timer);
  }, [selectedArea]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(externalQuery);
      setArea(ALL_CUISINES);
      setCategory(ALL_CATEGORIES);
      setVisible(24);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [externalQuery, searchVersion]);

  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    meals.forEach((meal) => { counts[meal.area] = (counts[meal.area] ?? 0) + 1; });
    return counts;
  }, [meals]);
  const areas = useMemo(() => Object.keys(areaCounts).sort(), [areaCounts]);
  const categories = useMemo(() => Array.from(new Set(meals.map((meal) => meal.category).filter(Boolean))).sort(), [meals]);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const translatedNormalized = translatedQuery.trim().toLowerCase();
    return meals.filter((meal) => {
      const matchesQuery = !normalized || meal.searchText.includes(normalized) || (Boolean(translatedNormalized) && meal.searchText.includes(translatedNormalized));
      const matchesArea = area === ALL_CUISINES || meal.area === area;
      const matchesCategory = category === ALL_CATEGORIES || meal.category === category;
      return matchesQuery && matchesArea && matchesCategory;
    });
  }, [area, category, meals, query, translatedQuery]);

  return (
    <>
    <section className="library-section section-shell" id="global-explore">
      <div className="section-heading library-heading">
        <div>
          <span className="kicker"><i /> {t("library.kicker")}</span>
          <h2>{t("library.title")}</h2>
        </div>
        <div className="library-source"><strong>{loading ? t("library.loading") : t("library.indexed", { count: meals.length })}</strong><small>{t("library.recipeSource")}</small></div>
      </div>

      <div className="library-toolbar">
        <label><span className="sr-only">{t("library.searchLabel")}</span><input value={query} onChange={(event) => { setQuery(event.target.value); setVisible(24); }} placeholder={t("library.search")} /></label>
        <label><span className="sr-only">{t("library.allCuisines")}</span><select value={area} onChange={(event) => { setArea(event.target.value); setVisible(24); }}><option value={ALL_CUISINES}>{t("library.allCuisines")}</option>{areas.map((item) => <option key={item} value={item}>{`${item} (${areaCounts[item] ?? 0})`}</option>)}</select></label>
        <label><span className="sr-only">{t("library.allCategories")}</span><select value={category} onChange={(event) => { setCategory(event.target.value); setVisible(24); }}><option value={ALL_CATEGORIES}>{t("library.allCategories")}</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>

      {loading ? (
        <div className="library-loading" role="status">{t("library.gathering")}</div>
      ) : error ? (
        <div className="empty-state"><span>↻</span><h3>{t("library.error")}</h3><p>{t("library.errorCopy")}</p></div>
      ) : filtered.length ? (
        <>
          <div className="library-grid">
            {filtered.slice(0, visible).map((meal) => (
              <article className="library-card" key={meal.id}>
                <RecipeLink meal={meal} className="library-image"><img src={meal.image} alt={meal.name} loading="lazy" decoding="async" /><span>{meal.flag} {meal.area || "Global"}</span></RecipeLink>
                <div>
                  <p>{meal.category || "Recipe"}</p>
                  <RecipeLink meal={meal}><h3>{meal.name}</h3></RecipeLink>
                  <div className="library-sensory">
                    <span><small>{t("library.taste")}</small>{meal.taste}</span>
                    <span><small>{t("library.texture")}</small>{meal.texture}</span>
                    <span><small>{t("library.origin")}</small>{meal.origin}</span>
                  </div>
                  <small className="library-source-note">{t("library.sourceLabel")}: {meal.source}</small>
                </div>
              </article>
            ))}
          </div>
          {visible < filtered.length ? <button className="load-more" type="button" onClick={() => setVisible((count) => count + 24)}>{t("library.loadMore")} <span>{t("library.remaining", { count: filtered.length - visible })}</span></button> : null}
        </>
      ) : (
        <div className="empty-state"><span>🍲</span><h3>{t("library.noMatch")}</h3><p>{t("library.noMatchCopy")}</p><button type="button" onClick={() => { setQuery(""); setArea(ALL_CUISINES); setCategory(ALL_CATEGORIES); }}>{t("library.reset")}</button></div>
      )}
    </section>
    <CommunityNotesSection notes={notes} coverage={coverage} loading={loading} />
    </>
  );
}

function CommunityNotesSection({ notes, coverage, loading }: { notes: ImportedMeal[]; coverage: Coverage | null; loading: boolean }) {
  const { locale, t } = useI18n();
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const translatedQuery = useEnglishSearchQuery(query, locale);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const translatedNormalized = translatedQuery.trim().toLowerCase();
    return notes.filter((note) => !normalized || note.searchText.includes(normalized) || (Boolean(translatedNormalized) && note.searchText.includes(translatedNormalized)));
  }, [notes, query, translatedQuery]);
  const visible = expanded ? filtered : filtered.slice(0, 8);

  return (
    <section className="community-note-library section-shell" id="community-notes">
      <div className="section-heading">
        <div><span className="kicker"><i /> {t("notes.kicker")}</span><h2>{t("notes.title")}</h2></div>
        <p>{t("notes.deck")}</p>
      </div>
      {coverage ? <div className="coverage-note"><span aria-hidden="true">◎</span><div><strong>{t("library.coverage")}</strong><p>{t("library.coverageCopy", { target: coverage.minimumTarget, added: coverage.socialRecipesAdded })}</p></div></div> : null}
      <div className="community-note-toolbar"><label><span className="sr-only">{t("notes.searchLabel")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("notes.search")} /></label><span>{loading ? t("library.loading") : t("notes.indexed", { count: notes.length })}</span></div>
      {visible.length ? <div className="community-note-card-grid">{visible.map((note) => <article key={note.id}>
        <Link className={`community-note-card-image${note.imageVerified ? "" : " context-image"}`} href={`/notes/${note.id}`}><img src={note.image} alt={note.imageVerified ? note.name : `${note.imageSubject}; a regional reference rather than a photograph of ${note.name}`} /><span>{note.flag} {note.area}</span>{!note.imageVerified ? <small>Regional context image</small> : null}</Link>
        <div><p>{note.category}</p><h3><Link href={`/notes/${note.id}`}>{note.name}</Link></h3><span>{note.summary}</span><small>{t("library.noteSource")}</small></div>
      </article>)}</div> : <div className="empty-state"><span>✎</span><h3>{t("notes.empty")}</h3><p>{t("notes.emptyCopy")}</p></div>}
      {!query && filtered.length > 8 ? <button className="load-more" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? t("notes.showLess") : t("notes.showAll", { count: filtered.length })}</button> : null}
    </section>
  );
}

function RecipeLink({ meal, className, children }: { meal: ImportedMeal; className?: string; children: React.ReactNode }) {
  return <Link className={className} href={`/recipes/${meal.id}`}>{children}</Link>;
}
