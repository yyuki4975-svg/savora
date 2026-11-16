import type { Metadata } from "next";
import Link from "next/link";
import { SavoraLogoMark } from "../../savora-logo";
import { Footer, Header } from "../../ui";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Phase 3 brand system",
  description: "Savora's Material 3 design foundation and food-culture identity.",
  robots: { index: false, follow: false },
};

const colors = [
  { name: "Primary · herb", hex: "#5F715B", className: styles.primary },
  { name: "Secondary · sea glass", hex: "#607E79", className: styles.secondary },
  { name: "Tertiary · clay", hex: "#8A594A", className: styles.tertiary },
  { name: "Surface · ivory", hex: "#FCFCF8", className: styles.surface },
];

const layers = [
  {
    index: "01",
    title: "Primitive",
    copy: "Buttons, links, dialogs, fields and feedback use Material 3 roles for predictable states and accessibility.",
    meta: "Reusable foundation",
  },
  {
    index: "02",
    title: "Editorial",
    copy: "Hero stories, image essays, curated rails and place panels turn recipes into paths for cultural discovery.",
    meta: "Public exploration",
  },
  {
    index: "03",
    title: "Recipe / Product",
    copy: "Ingredients, steps, cook mode and planning remain direct, structured and efficient when it is time to cook.",
    meta: "Kitchen utility",
  },
];

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5" /></svg>;
}

export default function BrandPreviewPage() {
  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.hero} aria-labelledby="brand-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Phase 03 · Identity system</p>
          <h1 id="brand-title">A recipe book<br />that keeps growing.</h1>
          <p className={styles.lede}>Savora combines the open pages of a cookbook with a new leaf: knowledge preserved, shared, and brought back into the kitchen.</p>
          <div className={styles.heroActions}>
            <Link className={styles.filledButton} href="/phase-3/catalog-preview">View catalog example <ArrowIcon /></Link>
            <Link className={styles.textButton} href="/explore">Open Explore</Link>
          </div>
        </div>
        <div className={styles.markStage} aria-label="Savora logo: an open recipe book growing two leaves">
          <span className={styles.orbit} aria-hidden="true" />
          <SavoraLogoMark className={styles.heroMark} title="Savora open recipe book and leaf mark" />
          <span className={styles.markCaption}>OPEN BOOK · LEAF · SHARED TABLE</span>
        </div>
      </section>

      <section className={styles.statement} aria-labelledby="system-title">
        <p className={styles.kicker}>Google Arts & Culture structure × Material 3 foundation</p>
        <h2 id="system-title">Familiar enough to use.<br />Distinct enough to remember.</h2>
        <p>Material 3 supplies semantic color roles, adaptive layout, shape hierarchy and interaction states. Savora supplies the quiet palette, food photography, cultural pathways and its own identity.</p>
      </section>

      <section className={styles.logoSection} aria-labelledby="logo-title">
        <header>
          <p className={styles.sectionNumber}>01</p>
          <div><p className={styles.kicker}>Logo family</p><h2 id="logo-title">One mark, three useful scales</h2></div>
        </header>
        <div className={styles.logoGrid}>
          <article className={styles.logoCardWide}>
            <div className={styles.lockup}><span><SavoraLogoMark /></span><strong>Savora</strong></div>
            <p>Primary wordmark · navigation and editorial covers</p>
          </article>
          <article className={styles.logoCardSoft}>
            <SavoraLogoMark />
            <p>App mark · favicon and compact navigation</p>
          </article>
          <article className={styles.logoCardDark}>
            <SavoraLogoMark />
            <p>Single-color mark · photography and dark surfaces</p>
          </article>
        </div>
      </section>

      <section className={styles.paletteSection} aria-labelledby="palette-title">
        <header>
          <p className={styles.sectionNumber}>02</p>
          <div><p className={styles.kicker}>M3 color roles</p><h2 id="palette-title">Soft contrast, clear purpose</h2></div>
        </header>
        <div className={styles.swatchGrid}>
          {colors.map((color) => (
            <article className={color.className} key={color.name}>
              <span aria-hidden="true" />
              <strong>{color.name}</strong>
              <small>{color.hex}</small>
            </article>
          ))}
        </div>
        <p className={styles.paletteNote}>Clay and herb no longer compete as large saturated blocks. They appear through semantic roles—actions, containers, labels and focused moments.</p>
      </section>

      <section className={styles.typeSection} aria-labelledby="type-title">
        <header>
          <p className={styles.sectionNumber}>03</p>
          <div><p className={styles.kicker}>Typography</p><h2 id="type-title">Warm, rounded, human</h2></div>
        </header>
        <div className={styles.typeSpecimen}>
          <div><span>Display large · 64/64</span><p>Every recipe carries a place.</p></div>
          <div><span>Headline medium · 32/38</span><p>Follow an ingredient across kitchens and generations.</p></div>
          <div><span>Body large · 18/30</span><p>Nunito Sans replaces the former editorial-serif treatment on the discovery interface. Its open forms keep labels readable while feeling less formal and less template-like.</p></div>
        </div>
      </section>

      <section className={styles.architecture} aria-labelledby="architecture-title">
        <header>
          <p className={styles.sectionNumber}>04</p>
          <div><p className={styles.kicker}>Development-plan architecture</p><h2 id="architecture-title">One system, three interface layers</h2></div>
        </header>
        <div className={styles.layerGrid}>
          {layers.map((layer) => (
            <article key={layer.title}>
              <span>{layer.index}</span>
              <small>{layer.meta}</small>
              <h3>{layer.title}</h3>
              <p>{layer.copy}</p>
            </article>
          ))}
        </div>
        <div className={styles.architectureRule}>
          <strong>Visual boundary</strong>
          <p>Public discovery may be spacious and expressive. Recipe execution becomes quieter and denser. Personal Kitchen remains a compact productivity surface—never an exhibition page.</p>
        </div>
      </section>

      <aside className={styles.reviewBar} aria-label="Phase 3 preview navigation">
        <span>Phase 3 review</span>
        <Link href="/phase-3/catalog-preview">Catalog example</Link>
        <Link href="/phase-3/explore-preview">Explore preview</Link>
        <Link href="/phase-3/story-preview/paella-valenciana">Story exhibition</Link>
        <Link href="/phase-3/catalog-preview?state=empty">Empty state</Link>
        <Link href="/phase-3/catalog-preview?state=error">Error state</Link>
      </aside>

      <Footer />
    </main>
  );
}
