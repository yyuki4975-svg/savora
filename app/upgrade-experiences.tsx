"use client";

import Link from "next/link";
import { useState } from "react";
import { videos } from "./data";
import { ExploreLibrary } from "./explore-library";
import { EditorialRecipeFinder } from "./editorial-recipe-finder";
import { useI18n } from "./i18n";
import { catalogDishes, curatedCollections, foodAssets } from "./product-data";
import { VideoCard } from "./ui";
import k from "./kitchen-passed-bowl.module.css";
import m from "./media-pages.module.css";

const all = (values: string[]) => ["All", ...Array.from(new Set(values)).sort()];

export function AdvancedExplore({ initialQuery = "" }: { initialQuery?: string }) {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialQuery);
  const [searchVersion, setSearchVersion] = useState(0);
  const [recent, setRecent] = useState<string[]>(["ramen", "vegetarian", "under 45 minutes"]);

  function runSearch(value = query) {
    const next = value.trim();
    if (next) setRecent((items) => [next, ...items.filter((item) => item !== next)].slice(0, 5));
    setSearchVersion((version) => version + 1);
    window.setTimeout(() => document.getElementById("global-explore")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  }

  return (
    <>
      <section className="product-hero section-shell">
        <span className="kicker"><i /> {t("explore.kicker")}</span>
        <h1>{t("explore.title")}</h1>
        <p>{t("explore.deck")}</p>
        <form className="discovery-search" onSubmit={(event) => { event.preventDefault(); runSearch(); }}>
          <label><span className="sr-only">{t("explore.search")}</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("explore.search")} /></label>
          <button type="submit">{t("explore.action")}</button>
        </form>
        <div className="search-memory"><span>{t("explore.recent")}</span>{recent.map((item) => <button type="button" key={item} onClick={() => { setQuery(item); runSearch(item); }}>{item}</button>)}</div>
      </section>

      <EditorialRecipeFinder query={query} />

      <section className="section-shell extended-index-intro">
        <span className="kicker"><i /> Wider recipe index</span>
        <h2>Keep exploring across the global library</h2>
        <p>Search additional sourced recipes by dish, ingredient, cuisine, or category. Community research notes remain in their own section.</p>
      </section>
      <ExploreLibrary selectedArea="" externalQuery={query} searchVersion={searchVersion} />

      <section className="section-shell collection-section">
        <div className="section-heading"><div><span className="kicker"><i /> {t("explore.collections")}</span><h2>{t("explore.collectionsTitle")}</h2></div></div>
        <div className="collection-editorial-grid">{curatedCollections.map((collection, index) => {
          const leadDish = catalogDishes.find((item) => item.slug === collection.slugs[0])!;
          return <article key={collection.title} className={`collection-editorial-card collection-card-${index + 1}`}>
            <Link className="collection-editorial-image" href={`/dishes/${leadDish.slug}`} aria-label={`Open ${leadDish.name} from ${collection.title}`}>
              <img src={leadDish.image} alt={`${leadDish.name}, representing the ${collection.title} collection`} width="1200" height="900" loading="lazy" decoding="async" />
              <span>{String(index + 1).padStart(2, "0")}</span>
            </Link>
            <div className="collection-editorial-copy"><small>Curated pathway</small><h3>{collection.title}</h3><p>{collection.copy}</p><div>{collection.slugs.map((slug) => { const dish = catalogDishes.find((item) => item.slug === slug)!; return <Link href={`/dishes/${slug}`} key={slug}><span>{dish.flag} {dish.name}</span><b aria-hidden="true">→</b></Link>; })}</div></div>
          </article>;
        })}</div>
      </section>
    </>
  );
}

export function VideoDiscovery() {
  const [query, setQuery] = useState("");
  const [trustedOnly, setTrustedOnly] = useState(false);
  const visible = videos.filter((video) => (!query || `${video.dish} ${video.title} ${video.creator}`.toLowerCase().includes(query.toLowerCase())) && (!trustedOnly || video.trusted));
  return (
    <div className={k.page}>
      <header className={k.toolHeader}><div className={k.toolHeaderInner}><div><h1>Cooking videos</h1><p>Savora embeds original YouTube uploads, credits every creator, and never copies or re-uploads video frames.</p></div></div></header>
      <div className={k.toolBody}>
        <div className={m.toolbar}>
          <label className={m.search}><span className="sr-only">Search videos</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search dish or creator" /></label>
          <label className={m.check}><input type="checkbox" checked={trustedOnly} onChange={(event) => setTrustedOnly(event.target.checked)} /> Established creators only</label>
          <span className={k.meta}>Metadata snapshot: Aug 6, 2026</span>
        </div>
        {visible.length ? <div className={m.videoGrid}>{visible.map((video) => <VideoCard key={video.id} video={video} />)}</div> : <div className={k.empty}><h2>No videos match.</h2><p>Try a dish name or clear the creator filter.</p></div>}
        <aside className={m.policy}><strong>Creator-first media policy</strong><p>Removed, private, or region-blocked videos automatically fall back to the recipe image and original YouTube link. View counts are public metadata snapshots, not live guarantees.</p></aside>
      </div>
    </div>
  );
}

export function AssetLibrary() {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [selected, setSelected] = useState<string[]>([]);
  const [tagged, setTagged] = useState(false);
  const filtered = foodAssets.filter((asset) => (!query || `${asset.title} ${asset.dish} ${asset.country} ${asset.tags.join(" ")}`.toLowerCase().includes(query.toLowerCase())) && (type === "All" || asset.type === type));
  const altCoverage = foodAssets.length ? Math.round((foodAssets.filter((asset) => asset.alt.trim()).length / foodAssets.length) * 100) : 0;
  function toggle(id: string) { setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]); }
  return (
    <div className={k.page}>
      <header className={k.toolHeader}><div className={k.toolHeaderInner}><div><h1>Asset library</h1><p>A structured editorial library for responsive imagery, YouTube embeds, accessibility text, attribution, and moderation.</p></div></div></header>
      <div className={k.toolBody}>
        <dl className={m.stats}><div><dt>Managed assets</dt><dd>{foodAssets.length}</dd></div><div><dt>Published</dt><dd>{foodAssets.filter((asset) => asset.status === "Published").length}</dd></div><div><dt>Need attention</dt><dd>{foodAssets.filter((asset) => asset.warning).length}</dd></div><div><dt>Alt text coverage</dt><dd>{`${altCoverage}%`}</dd></div></dl>
        <div className={m.toolbar}>
          <label className={m.search}><span className="sr-only">Search assets</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search assets, dishes, countries, or tags" /></label>
          <select aria-label="Filter by asset type" value={type} onChange={(event) => setType(event.target.value)}>{all(foodAssets.map((asset) => asset.type)).map((item) => <option value={item} key={item}>{item}</option>)}</select>
          <div className={k.segmented} role="group" aria-label="Layout"><button type="button" aria-pressed={view === "grid"} onClick={() => setView("grid")}>Grid</button><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>List</button></div>
        </div>
        {selected.length ? <div className={m.bulk}><strong>{selected.length} selected</strong><button className={k.secondary} type="button" onClick={() => setTagged(true)}>Add “editor reviewed” tag</button><button className={k.quiet} type="button" onClick={() => setSelected([])}>Clear</button>{tagged ? <span role="status" className={k.meta}>Tag added to this review session only; it is not saved.</span> : null}</div> : null}
        <div className={view === "grid" ? m.assetGrid : m.assetList}>{filtered.map((asset) => <article data-selected={selected.includes(asset.id) ? "true" : "false"} key={asset.id}><label className={m.select}><input type="checkbox" checked={selected.includes(asset.id)} onChange={() => toggle(asset.id)} /><span className="sr-only">Select {asset.title}</span></label><img src={asset.source} alt={asset.alt} /><div><p className={k.meta}>{asset.type} · {asset.status}</p><h3>{asset.title}</h3><dl><div><dt>Dish</dt><dd>{asset.dish}</dd></div><div><dt>Rights</dt><dd>{asset.license}</dd></div><div><dt>Creator</dt><dd>{asset.creator}</dd></div><div><dt>Size</dt><dd>{asset.size}</dd></div></dl>{asset.warning ? <strong className={m.warning}>{asset.warning}</strong> : <span className={m.ok}>Attribution complete</span>}</div></article>)}</div>
      </div>
    </div>
  );
}
