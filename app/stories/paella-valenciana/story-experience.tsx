import Image from "next/image";
import Link from "next/link";
import { Footer, Header } from "../../ui";
import { getRecipe } from "../../../lib/api/savora-client";
import { paellaExhibitionMedia as commonsMedia } from "../../../lib/editorial/paella-exhibition-media";
import styles from "./story.module.css";
import { localImage } from "../../../lib/media/local-media";

const facts = [
  {
    number: "01",
    title: "It begins in Valencia",
    copy: "Paella is a Valencian rice tradition. Its modern story is tied to the landscape around the Albufera lagoon, where rice cultivation shaped both work and the local table.",
  },
  {
    number: "02",
    title: "The landscape is an ingredient",
    copy: "Rice paddies turn water, season, and patient fieldwork into the grain at the center of the dish. Place is not decoration here; it is part of the recipe's logic.",
  },
  {
    number: "03",
    title: "The traditional meat is specific",
    copy: "Savora's reviewed version uses rabbit and chicken—not a generic mixture of every Spanish ingredient—alongside green beans.",
  },
  {
    number: "04",
    title: "Saffron carries color and aroma",
    copy: "A small amount seasons the cooking liquid, giving the rice its warm golden tone without turning color into the only measure of authenticity.",
  },
  {
    number: "05",
    title: "The pan changes the rice",
    copy: "A wide, shallow pan spreads the grains into a thin layer. Heat, evaporation, and surface area become part of the technique.",
  },
  {
    number: "06",
    title: "The rice is distributed once",
    copy: "After the liquid returns to a boil, the rice is spread evenly and left unstirred so it can cook as a coherent layer rather than like a creamy risotto.",
  },
  {
    number: "07",
    title: "Listen for the socarrat",
    copy: "As the liquid evaporates, careful final cooking can toast the bottom layer. The gentle crackle is a sensory cue that technique is becoming flavor.",
  },
  {
    number: "08",
    title: "It is made to be shared",
    copy: "The pan can travel directly to the table, and outdoor cooking turns preparation into a public, social act. The vessel is both cookware and gathering point.",
  },
] as const;

function MediaCredit({ credit, source }: { credit: string; source: string }) {
  return <a className={styles.mediaCredit} href={source} target="_blank" rel="noreferrer noopener">{credit} <span aria-hidden="true">↗</span></a>;
}

export async function PaellaExhibition({ preview = false }: { preview?: boolean }) {
  const explorePath = preview ? "/phase-3/explore-preview" : "/explore";
  const recipeResult = await getRecipe("paella", "en");
  const recipe = recipeResult.status === "ok" ? recipeResult.data : null;
  if (!recipe || !recipe.primaryMedia) {
    return (
      <main className={styles.page} data-exhibition>
        <Header />
        <section className={styles.errorPanel}>
          <p>Online exhibition</p>
          <h1>This story cannot open without its reviewed recipe and media.</h1>
          <Link href={explorePath}>Return to Explore</Link>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className={styles.page} data-exhibition>
      <Header />

      <section className={styles.hero} aria-labelledby="story-title">
        <Image src={localImage(commonsMedia.traditionalPaella.src)} alt={commonsMedia.traditionalPaella.alt} fill preload sizes="100vw" />
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.heroCopy}>
          <p>Online exhibition · Valencia, Spain</p>
          <h1 id="story-title">From wetland to pan</h1>
          <span>A food-culture story behind Paella Valenciana</span>
        </div>
        <div className={styles.scrollCue}><span aria-hidden="true" /> Scroll to begin</div>
        <MediaCredit credit={commonsMedia.traditionalPaella.credit} source={commonsMedia.traditionalPaella.source} />
      </section>

      <nav className={styles.storyRail} aria-label="Exhibition chapters">
        <a href="#landscape">Landscape</a>
        <a href="#ingredients">Ingredients</a>
        <a href="#technique">Technique</a>
        <a href="#table">The table</a>
        <a href="#credits">Credits</a>
      </nav>

      <section className={styles.intro}>
        <p className={styles.eyebrow}>A dish as cultural object</p>
        <h2>Paella is not merely “Spanish rice.” It is a conversation between landscape, vessel, heat, and the people around the pan.</h2>
        <p>This exhibition connects Savora&apos;s published recipe with the landscape, local ingredients and cooking practices described by Visit Valencia. The photographs and recipe record are credited below.</p>
      </section>

      <section className={`${styles.landscape} ${styles.reveal}`} id="landscape" aria-labelledby="landscape-title">
        <div className={styles.landscapeImage}>
          <Image src={localImage(commonsMedia.riceField.src)} alt={commonsMedia.riceField.alt} fill sizes="100vw" />
          <MediaCredit credit={commonsMedia.riceField.credit} source={commonsMedia.riceField.source} />
        </div>
        <div className={styles.landscapeCopy}>
          <p className={styles.eyebrow}>Landscape</p>
          <h2 id="landscape-title">Before the pan, there is water.</h2>
          <p>The rice fields of the Albufera turn a local ecosystem into an edible archive. The dish remembers irrigation, seasons, and the labor of growing grain close to Valencia.</p>
          <div className={styles.factPair}>
            {facts.slice(0, 2).map((fact) => <article key={fact.number}><h3>{fact.title}</h3><p>{fact.copy}</p></article>)}
          </div>
        </div>
      </section>

      <section className={styles.ingredientChapter} id="ingredients" aria-labelledby="ingredient-title">
        <header className={styles.chapterHeading}>
          <p className={styles.eyebrow}>Ingredients</p>
          <h2 id="ingredient-title">A short list with a long memory.</h2>
        </header>
        <div className={styles.ingredientFacts}>
          {facts.slice(2, 4).map((fact) => <article className={styles.reveal} key={fact.number}><h3>{fact.title}</h3><p>{fact.copy}</p></article>)}
          <aside className={styles.recipeInventory}>
            <small>From the reviewed recipe</small>
            <ul>{recipe.ingredients.map((ingredient) => <li key={`${ingredient.position}-${ingredient.name}`}>{ingredient.name}</li>)}</ul>
          </aside>
        </div>
      </section>

      <section className={styles.techniqueChapter} id="technique" aria-labelledby="technique-title">
        <div className={styles.stickyMedia}>
          <Image src={localImage(commonsMedia.traditionalPaella.src)} alt={commonsMedia.traditionalPaella.alt} fill sizes="(max-width: 900px) 100vw, 58vw" />
          <MediaCredit credit={commonsMedia.traditionalPaella.credit} source={commonsMedia.traditionalPaella.source} />
        </div>
        <div className={styles.techniqueCopy}>
          <header className={styles.chapterHeading}>
            <p className={styles.eyebrow}>Technique</p>
            <h2 id="technique-title">The pan teaches the cook.</h2>
          </header>
          {facts.slice(4, 7).map((fact) => (
            <article className={styles.techniqueFact} key={fact.number}>
              <h3>{fact.title}</h3>
              <p>{fact.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.tableChapter} id="table" aria-labelledby="table-title">
        <div className={`${styles.tableCopy} ${styles.reveal}`}>
          <p className={styles.eyebrow}>The table</p>
          <h2 id="table-title">{facts[7].title}</h2>
          <p>{facts[7].copy}</p>
        </div>
        <div className={styles.tableImage}>
          <Image src={localImage(commonsMedia.publicCooking.src)} alt={commonsMedia.publicCooking.alt} fill sizes="(max-width: 900px) 100vw, 62vw" />
          <MediaCredit credit={commonsMedia.publicCooking.credit} source={commonsMedia.publicCooking.source} />
        </div>
      </section>

      <section className={styles.recipeHandoff} aria-labelledby="handoff-title">
        <p className={styles.eyebrow}>From exhibition to kitchen</p>
        <h2 id="handoff-title">Now cook the object you just explored.</h2>
        <p>The story ends where Savora&apos;s Recipe/Product layer begins: measured ingredients, clear steps, timing, and a focused cooking mode.</p>
        <Link href={`/recipes/${recipe.slug}`}>Open {recipe.title} <span aria-hidden="true">→</span></Link>
      </section>

      <section className={styles.credits} id="credits" aria-labelledby="credits-title">
        <h2 id="credits-title">Sources and credits</h2>
        <div>
          <article>
            <h3>Recipe</h3>
            <p>{recipe.sources[0]?.sourceName ?? "Savora published archive"}</p>
            {recipe.sources[0]
              ? <a href={recipe.sources[0].sourceUrl} target="_blank" rel="noreferrer noopener">View source ↗</a>
              : <Link href={`/recipes/${recipe.slug}`}>View recipe →</Link>}
          </article>
          <article><h3>Lead image</h3><p>{commonsMedia.traditionalPaella.credit}</p><a href={commonsMedia.traditionalPaella.source} target="_blank" rel="noreferrer noopener">View source and license ↗</a></article>
          <article><h3>Cultural context</h3><p>Valencia&apos;s tourism foundation documents the Albufera landscape, local ingredients and pan tradition.</p><a href="https://blog.visitvalencia.com/en/paella-valenciana" target="_blank" rel="noreferrer noopener">Read Visit Valencia ↗</a></article>
          <article><h3>Editorial status</h3><p>Sources checked; specialist cultural review is still pending before search indexing.</p><Link href={explorePath}>Back to Explore →</Link></article>
        </div>
      </section>

      <Footer />
    </main>
  );
}
