import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { dishes } from "../../data";
import { Footer, Header } from "../../ui";
import { ChapterRail, Gallery, SeasonQuiz } from "./autumn-client";
import { CHAPTERS, FACTS, PHOTOS, QUIZ, READING, SOLAR_TERMS, WORLD_TABLES, photoSrc, type Photo } from "./exhibition";
import styles from "./autumn-table.module.css";

export const metadata: Metadata = {
  title: "The autumn table",
  description: "A seasonal Savora exhibition moving from China’s autumn solar terms and the Mid-Autumn moon to harvest tables across the world.",
};

const recipeSlugs = ["mapo-tofu", "ramen", "tagine", "ratatouille"];
const autumnRecipes = recipeSlugs.flatMap((slug) => {
  const dish = dishes.find((item) => item.slug === slug);
  return dish ? [dish] : [];
});

const RAIL = [
  { id: "almanac", label: "Almanac" },
  ...CHAPTERS.map((chapter) => ({ id: chapter.id, label: chapter.nav })),
  { id: "full-moon", label: "Full moon" },
  { id: "world", label: "Around the world" },
  { id: "cook", label: "Cook" },
];

// Points on the almanac's sun path, left to right: the autumn sun sits lower each term.
const SUN_POINTS = [[100, 64], [300, 78], [500, 98], [700, 124], [900, 158], [1100, 200]] as const;
const SUN_PATH = "M100 64 C 200 64, 233 74, 300 78 S 433 92, 500 98 S 633 116, 700 124 S 833 148, 900 158 S 1033 188, 1100 200";

function Credit({ photo, className }: { photo: Photo; className?: string }) {
  return <figcaption className={className ?? styles.caption}><span>{photo.caption}</span> <span translate="no">{photo.author} · {photo.license}</span></figcaption>;
}

export default function AutumnTablePage() {
  const allPhotos = Object.values(PHOTOS);
  return (
    <main className={styles.page} data-exhibition>
      <Header />

      <header className={styles.hero}>
        <div className={styles.heroImage}>
          <Image src={photoSrc(PHOTOS.hero)} alt="Rows of peeled persimmons hanging on strings to dry." fill priority quality={88} sizes="100vw" />
        </div>
        <div className={styles.heroWash} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p>Seasonal exhibition · Autumn 2026</p>
          <h1>The autumn table</h1>
          <span>从立秋到霜降，再走向世界各地的收获餐桌。</span>
          <span className={styles.heroLead}>Six solar terms, one full moon, and harvest tables from Japan to Mexico.</span>
          <a href="#almanac">Begin the season <b aria-hidden="true">↓</b></a>
        </div>
        <p className={styles.heroCredit}><span>{PHOTOS.hero.caption}</span> <span translate="no">· {PHOTOS.hero.author} · {PHOTOS.hero.license}</span></p>
      </header>

      <ChapterRail items={RAIL} label="Autumn exhibition chapters" />

      <section className={styles.intro} aria-labelledby="autumn-intro-title">
        <p>One season, many climates</p>
        <h2 id="autumn-intro-title">Autumn is not one flavor. It is a change in pace.</h2>
        <div>
          <p>China’s solar terms offer the exhibition its first rhythm: cooling air, ripening grain, white dew, cold dew, and first frost. Food makes those changes tangible.</p>
          <p>From there, the route widens. A mushroom, a slow braise, a roasted nut, or a piece of fruit can tell us how different places notice the same turn of year.</p>
        </div>
      </section>

      <section className={styles.almanac} id="almanac" aria-labelledby="almanac-title">
        <header className={styles.sectionHead}>
          <p>The almanac</p>
          <h2 id="almanac-title">Six solar terms, six reasons to set the table.</h2>
          <span>China’s farming calendar divides the year into twenty-four solar terms of about fifteen days each. In 2016 UNESCO inscribed them on its list of the Intangible Cultural Heritage of Humanity.</span>
        </header>
        <svg className={styles.sunPath} viewBox="0 0 1200 240" aria-hidden="true">
          <path className={styles.sunTrack} d={SUN_PATH} />
          <path className={styles.sunLine} d={SUN_PATH} pathLength={1} />
          {SUN_POINTS.map(([x, y]) => <circle className={styles.sunStop} cx={x} cy={y} r={7} key={x} />)}
          <g className={styles.sun} style={{ offsetPath: `path("${SUN_PATH}")` }}><circle r={15} /><circle r={24} className={styles.sunHalo} /></g>
        </svg>
        <ol className={styles.terms}>
          {SOLAR_TERMS.map((term) => (
            <li key={term.hanzi}>
              <span className={styles.hanzi} lang="zh">{term.hanzi}</span>
              <span className={styles.pinyin} translate="no">{term.pinyin}</span>
              <strong>{term.name}</strong>
              <small>{term.date}</small>
              <p>{term.food}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.chapters} aria-label="Autumn food stories">
        {CHAPTERS.map((chapter, index) => (
          <article className={`${styles.chapter} ${styles[chapter.tone]} ${index % 2 ? styles.reverse : ""}`} id={chapter.id} key={chapter.id}>
            <figure>
              <Image src={photoSrc(chapter.photo)} alt={chapter.photo.caption} fill quality={88} sizes="(max-width: 980px) 100vw, 56vw" />
              <Credit photo={chapter.photo} className={styles.overlayCredit} />
              <a href={chapter.photo.page} target="_blank" rel="noreferrer noopener"><span className="sr-only">Open image source for {chapter.title}</span>↗</a>
            </figure>
            <div className={styles.chapterCopy}>
              <p><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{chapter.place}</p>
              <h2>{chapter.title}</h2>
              <span>{chapter.body}</span>
              <aside className={styles.fact}><b>Did you know?</b><span>{chapter.fact}</span></aside>
              <Link href={chapter.href}>{chapter.action} <b aria-hidden="true">→</b></Link>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.moon} id="full-moon" aria-labelledby="moon-title">
        <header className={styles.sectionHead}>
          <p>The fifteenth night of the eighth month</p>
          <h2 id="moon-title">One moon, two tables.</h2>
          <span>The Mid-Autumn Festival in China and Chuseok in Korea fall on the same full moon, usually in September or early October. Both bring families home, and both are eaten as much as they are celebrated.</span>
        </header>
        <div className={styles.tiles}>
          {[
            { photo: PHOTOS.mooncake, place: "China · Mid-Autumn Festival", title: "Mooncakes", text: "Round like the moon and cut into wedges to share, mooncakes stand for reunion. In the Cantonese style, a salted duck egg yolk sits in lotus-seed paste like a small moon of its own." },
            { photo: PHOTOS.songpyeon, place: "Korea · Chuseok", title: "Songpyeon", text: "Families shape these half-moon rice cakes together, filling them with sesame, beans or chestnut, then steam them on a bed of pine needles that leaves a light, resinous scent." },
          ].map((tile) => (
            <figure className={styles.tile} key={tile.title}>
              <div className={styles.tileImage}>
                <Image src={photoSrc(tile.photo)} alt={tile.photo.caption} fill quality={86} sizes="(max-width: 900px) 100vw, 50vw" />
                <div className={styles.tileText}>
                  <p>{tile.place}</p>
                  <h3>{tile.title}</h3>
                  <span>{tile.text}</span>
                </div>
              </div>
              <Credit photo={tile.photo} />
            </figure>
          ))}
        </div>
      </section>

      <blockquote className={styles.interlude}>
        <p>“Seasonality is a way of paying attention: to weather, markets, memory, and what tastes complete right now.”</p>
      </blockquote>

      <section className={styles.world} id="world" aria-labelledby="world-title">
        <header className={styles.sectionHead}>
          <p>Harvest tables around the world</p>
          <h2 id="world-title">The same turn of year, read in other kitchens.</h2>
          <span>Autumn arrives with frost in some places and with rain, new wine or remembrance in others. Five tables, from September to November.</span>
        </header>
        <Gallery previous="Previous table" next="Next table">
          {WORLD_TABLES.map((table) => (
            <article className={styles.card} key={table.id}>
              <figure>
                <div className={styles.cardImage}><Image src={photoSrc(table.photo)} alt={table.photo.caption} fill quality={82} sizes="(max-width: 700px) 82vw, 380px" /></div>
                <Credit photo={table.photo} />
              </figure>
              <p className={styles.cardMeta}><span>{table.place}</span><span>{table.when}</span></p>
              <h3>{table.title}</h3>
              <p>{table.body}</p>
              {table.href && table.action ? <Link href={table.href}>{table.action} <b aria-hidden="true">→</b></Link> : null}
            </article>
          ))}
        </Gallery>
      </section>

      <section className={styles.notes} aria-labelledby="notes-title">
        <header className={styles.sectionHead}>
          <h2 id="notes-title">Did you know?</h2>
        </header>
        <div className={styles.notesGrid}>
          <ul className={styles.facts}>{FACTS.map((fact) => <li key={fact}>{fact}</li>)}</ul>
          <SeasonQuiz title="Test your almanac" retry="Try again" {...QUIZ} />
        </div>
      </section>

      <section className={styles.recipes} id="cook" aria-labelledby="autumn-recipes-title">
        <header>
          <p>Cook into the season</p>
          <h2 id="autumn-recipes-title">Four dishes for cooler evenings.</h2>
          <Link href="/explore?q=autumn">Search the full archive <span aria-hidden="true">→</span></Link>
        </header>
        <div>
          {autumnRecipes.map((dish) => (
            <Link href={`/dishes/${dish.slug}`} key={dish.slug}>
              <span><Image src={dish.image} alt={`${dish.name} from ${dish.country}`} fill sizes="(max-width: 620px) 82vw, 25vw" /></span>
              <small>{dish.country} · {dish.time}</small>
              <strong>{dish.name}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.sources} aria-labelledby="autumn-sources-title">
        <div>
          <p>Reference & credits</p>
          <h2 id="autumn-sources-title">The story stays connected to its sources.</h2>
        </div>
        <div className={styles.sourcesBody}>
          <h3>Photographs</h3>
          <ul className={styles.photoCredits}>
            {allPhotos.map((photo) => (
              <li key={photo.file}>
                <a href={photo.page} target="_blank" rel="noreferrer noopener">{photo.caption}</a>
                <span translate="no">{photo.author} · <a href={photo.licenseUrl} target="_blank" rel="noreferrer noopener">{photo.license}</a> · Wikimedia Commons</span>
              </li>
            ))}
          </ul>
          <h3>Further reading</h3>
          <ul className={styles.reading}>
            {READING.map((item) => <li key={item.href}><a href={item.href} target="_blank" rel="noreferrer noopener">{item.label}</a></li>)}
          </ul>
        </div>
      </section>

      <Footer />
    </main>
  );
}
