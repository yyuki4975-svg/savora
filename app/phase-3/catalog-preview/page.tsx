import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Footer, Header } from "../../ui";
import {
  primaryRecipePlace,
  publishedMediaUrl,
  publishedRecipeCategory,
} from "../../../lib/api/published-recipe-presentation";
import { getRecipe, listRecipes, type RecipeDetail } from "../../../lib/api/savora-client";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Phase 3 catalog preview",
  description: "A database-driven discovery prototype for Savora.",
  robots: { index: false, follow: false },
};

type PreviewMode = "live" | "empty" | "error";
type DiscoveryIconName = "compass" | "place" | "calendar" | "heart";

type CatalogCard = {
  slug: string;
  title: string;
  summary: string;
  image: string;
  alt: string;
  place: string;
  relation: string;
  category: string;
  sourceName: string;
};

type CatalogPreviewResult =
  | { status: "ok"; cards: CatalogCard[]; publishedCount: number }
  | { status: "empty" }
  | { status: "error"; message: string };

function DiscoveryIcon({ name }: { name: DiscoveryIconName }) {
  if (name === "place") {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 28s8-7.2 8-15a8 8 0 1 0-16 0c0 7.8 8 15 8 15Z" /><circle cx="16" cy="13" r="2.8" /></svg>;
  }
  if (name === "calendar") {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="7" width="22" height="20" rx="5" /><path d="M10 4v6m12-6v6M5 13h22" /><circle cx="12" cy="19" r="1" /><circle cx="20" cy="19" r="1" /></svg>;
  }
  if (name === "heart") {
    return <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 27C8.5 22.2 5 18.7 5 13.2A5.7 5.7 0 0 1 15.7 10 5.7 5.7 0 0 1 27 13.2C27 18.7 23.5 22.2 16 27Z" /></svg>;
  }
  return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="11" /><path d="m20.5 11.5-2.7 6.3-6.3 2.7 2.7-6.3 6.3-2.7Z" /></svg>;
}

function toCard(recipe: RecipeDetail): CatalogCard | null {
  const image = publishedMediaUrl(recipe);
  const source = recipe.sources[0];
  if (!image || !source || !recipe.primaryMedia) return null;

  const association = primaryRecipePlace(recipe);
  return {
    slug: recipe.slug,
    title: recipe.title,
    summary: recipe.summary,
    image,
    alt: recipe.primaryMedia.altText || `${recipe.title}, a published Savora recipe`,
    place: association?.place.name ?? "Global table",
    relation: association?.relationType ?? "Reviewed publication",
    category: publishedRecipeCategory(recipe),
    sourceName: source.sourceName,
  };
}

async function loadPublishedCatalog(): Promise<CatalogPreviewResult> {
  // https://nextjs.org/docs/app/getting-started/fetching-data
  const catalog = await listRecipes("en", 50);
  if (catalog.status !== "ok") {
    return { status: "error", message: "The published archive could not be reached." };
  }

  const summaries = catalog.data.items.slice(0, 12);
  if (summaries.length === 0) return { status: "empty" };

  const details = await Promise.all(summaries.map((recipe) => getRecipe(recipe.slug, "en")));
  if (details.some((recipe) => recipe.status !== "ok")) {
    return { status: "error", message: "Some published records could not be verified." };
  }

  const cards = details.flatMap((recipe) => recipe.status === "ok" ? [toCard(recipe.data)] : [])
    .filter((card): card is CatalogCard => card !== null);
  if (cards.length !== summaries.length) {
    return { status: "error", message: "Some published records are missing approved media or source evidence." };
  }

  return { status: "ok", cards, publishedCount: catalog.data.items.length };
}

function readMode(value: string | string[] | undefined): PreviewMode {
  const mode = Array.isArray(value) ? value[0] : value;
  return mode === "empty" || mode === "error" ? mode : "live";
}

function StatePanel({ mode, message }: { mode: Exclude<PreviewMode, "live">; message?: string }) {
  const isEmpty = mode === "empty";
  return (
    <section className={styles.statePanel} aria-labelledby="catalog-state-title">
      <span className={styles.stateMark} aria-hidden="true">{isEmpty ? "○" : "!"}</span>
      <p className={styles.kicker}>Published collection</p>
      <h1 id="catalog-state-title">{isEmpty ? "Nothing here yet — but the table is still open." : "The archive is taking a short pause."}</h1>
      <p>{message ?? (isEmpty
        ? "Try another place or return to the complete collection."
        : "Your published records remain in PostgreSQL. Savora never replaces them with an unreviewed external feed.")}</p>
      <Link href="/phase-3/catalog-preview">Return to the live collection</Link>
    </section>
  );
}

export default async function PhaseThreeCatalogPreview({
  searchParams,
}: {
  searchParams: Promise<{ state?: string | string[] }>;
}) {
  const mode = readMode((await searchParams).state);
  const result = mode === "live" ? await loadPublishedCatalog() : null;

  if (mode !== "live") return <main className={styles.page}><Header /><StatePanel mode={mode} /><Footer /></main>;
  if (result?.status === "empty") return <main className={styles.page}><Header /><StatePanel mode="empty" /><Footer /></main>;
  if (!result || result.status === "error") {
    return <main className={styles.page}><Header /><StatePanel mode="error" message={result?.message} /><Footer /></main>;
  }

  const [lead, ...remaining] = result.cards;
  const topPicks = remaining.slice(0, 4);
  const focusCards = remaining.slice(4, 6);
  const places = Array.from(new Map(result.cards.map((card) => [card.place, card])).values()).slice(0, 6);
  const surprise = remaining[6] ?? lead;

  const discoveryLinks: Array<{ icon: DiscoveryIconName; label: string; copy: string; href: string; tone: string }> = [
    { icon: "compass", label: "Explore recipes", copy: "Browse every reviewed dish", href: "/explore", tone: styles.mint },
    { icon: "place", label: "Travel by taste", copy: "Open the world food map", href: "/world-map", tone: styles.sky },
    { icon: "calendar", label: "Plan your week", copy: "Turn inspiration into dinner", href: "/meal-planner", tone: styles.apricot },
    { icon: "heart", label: "Saved for later", copy: "Return to your recipe box", href: "/recipe-box", tone: styles.lilac },
  ];

  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.hero} aria-labelledby="catalog-preview-title">
        <div className={styles.phaseLine}>
          <span>Phase 03 · Catalog preview</span>
          <span>{result.publishedCount} reviewed recipes</span>
        </div>
        <div className={styles.heroImage}>
          {/* Next.js 16 uses preload for the single expected LCP image.
              Source: https://nextjs.org/docs/app/api-reference/components/image#preload */}
          <Image src={lead.image} alt={lead.alt} fill preload sizes="(max-width: 700px) 92vw, 94vw" />
          <div className={styles.heroBadge}>In focus</div>
          <article className={styles.heroCard}>
            <p>{lead.place} · {lead.category}</p>
            <h1 id="catalog-preview-title">{lead.title}</h1>
            <span>{lead.summary}</span>
            <Link href={`/recipes/${lead.slug}`}>Discover the recipe <i aria-hidden="true">→</i></Link>
          </article>
        </div>
      </section>

      <section className={styles.discovery} aria-labelledby="discovery-title">
        <header className={styles.centerHeading}>
          <p className={styles.kicker}>Find your way in</p>
          <h2 id="discovery-title">What are you looking for?</h2>
          <span>Start with a dish, a place, or tonight&apos;s plan.</span>
        </header>
        <div className={styles.discoveryGrid}>
          {discoveryLinks.map((item) => (
            <Link className={`${styles.discoveryCard} ${item.tone}`} href={item.href} key={item.label}>
              <span className={styles.iconBubble}><DiscoveryIcon name={item.icon} /></span>
              <strong>{item.label}</strong>
              <small>{item.copy}</small>
            </Link>
          ))}
        </div>
        <Link className={styles.surpriseLink} href={`/recipes/${surprise.slug}`}>Surprise me with a published recipe <span aria-hidden="true">↗</span></Link>
      </section>

      <section className={styles.topPicks} aria-labelledby="top-picks-title">
        <header className={styles.sectionHeading}>
          <div><p className={styles.kicker}>Fresh from the archive</p><h2 id="top-picks-title">Today&apos;s top picks</h2></div>
          <Link href="/explore">See all published recipes <span aria-hidden="true">→</span></Link>
        </header>
        <div className={styles.cardGrid}>
          {topPicks.map((card) => (
            <article className={styles.recipeCard} key={card.slug}>
              <Link href={`/recipes/${card.slug}`}>
                <div className={styles.cardImage}><Image src={card.image} alt={card.alt} fill sizes="(max-width: 700px) 92vw, (max-width: 1100px) 45vw, 23vw" /></div>
                <div className={styles.cardCopy}>
                  <p>{card.place}</p>
                  <h3>{card.title}</h3>
                  <span>{card.summary}</span>
                  <small>Source: {card.sourceName}</small>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {focusCards.length ? (
        <section className={styles.storyFeature} aria-labelledby="story-feature-title">
          <div className={styles.storyCopy}>
            <p className={styles.kicker}>Cook through a place</p>
            <h2 id="story-feature-title">Recipes are maps you can eat.</h2>
            <p>Follow techniques and ingredients across cities, homes, and generations—then bring the story back to your own kitchen.</p>
            <Link href="/world-map">Explore the food atlas <span aria-hidden="true">→</span></Link>
          </div>
          <div className={styles.storyImages}>
            {focusCards.map((card, index) => (
              <Link href={`/recipes/${card.slug}`} className={index === 0 ? styles.storyImageLarge : styles.storyImageSmall} key={card.slug}>
                <Image src={card.image} alt={card.alt} fill sizes={index === 0 ? "(max-width: 900px) 70vw, 35vw" : "(max-width: 900px) 46vw, 22vw"} />
                <span><strong>{card.title}</strong><small>{card.place}</small></span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.places} aria-labelledby="places-title">
        <header className={styles.centerHeading}>
          <p className={styles.kicker}>Explore by place</p>
          <h2 id="places-title">Where should we eat today?</h2>
        </header>
        <div className={styles.placeGrid}>
          {places.map((card) => (
            <Link href={`/recipes/${card.slug}`} key={card.place}>
              <span className={styles.placeImage}><Image src={card.image} alt="" fill sizes="(max-width: 700px) 40vw, 180px" /></span>
              <strong>{card.place}</strong>
              <small>{card.title}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.trust} aria-labelledby="trust-title">
        <header className={styles.centerHeading}>
          <p className={styles.kicker}>Quietly dependable</p>
          <h2 id="trust-title">Beautiful to browse. Clear about its sources.</h2>
        </header>
        <div>
          <article><span>01</span><h3>Published only</h3><p>Drafts never enter the public experience.</p></article>
          <article><span>02</span><h3>First-party catalog</h3><p>Recipes come from Savora&apos;s API and PostgreSQL.</p></article>
          <article><span>03</span><h3>Credit stays visible</h3><p>Recipe and image attribution travels with each record.</p></article>
        </div>
      </section>

      <aside className={styles.previewTools} aria-label="Catalog state examples">
        <span>Review interface states</span>
        <Link href="/phase-3/explore-preview">Explore preview</Link>
        <Link href="/phase-3/story-preview/paella-valenciana">Story exhibition</Link>
        <Link href="/phase-3/catalog-preview?state=empty">Empty state</Link>
        <Link href="/phase-3/catalog-preview?state=error">API error state</Link>
        <Link href="/phase-3/brand-preview">Brand system</Link>
      </aside>

      <Footer />
    </main>
  );
}
