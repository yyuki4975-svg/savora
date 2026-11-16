import Image from "next/image";
import Link from "next/link";
import type { DiscoveryRecipe } from "../../../../lib/api/published-discovery";
import { createExhibitionPhotoPicker } from "../../../../lib/editorial/exhibition-photography";
import { Footer, Header } from "../../../ui";
import styles from "./spain.module.css";
import { localImage } from "../../../../lib/media/local-media";

const media = {
  paella: {
    src: "https://upload.wikimedia.org/wikipedia/commons/e/ed/01_Paella_Valenciana_original.jpg",
    alt: "Traditional Paella Valenciana in a wide shallow pan.",
    credit: "Jan Harenburg · CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:01_Paella_Valenciana_original.jpg",
  },
  market: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Tapas_in_Mercado_de_San_Micuel_in_Madrid.jpg/1280px-Tapas_in_Mercado_de_San_Micuel_in_Madrid.jpg",
    alt: "A tapas stall in Madrid's Mercado de San Miguel.",
    credit: "Sbharris · CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Tapas_in_Mercado_de_San_Micuel_in_Madrid.jpg",
  },
  oliveHarvest: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Los_Navalmorales_2022_02.jpg/1280px-Los_Navalmorales_2022_02.jpg",
    alt: "Olive harvesters working among trees in Toledo, Spain.",
    credit: "LBM1948 · CC BY-SA 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Los_Navalmorales_2022_02.jpg",
  },
} as const;

function RecipeImage({ recipe, sizes }: { recipe: DiscoveryRecipe; sizes: string }) {
  return <Image src={recipe.image} alt={recipe.alt} fill sizes={sizes} />;
}

export function SpainExhibition({ recipes }: { recipes: DiscoveryRecipe[] }) {
  const pick = createExhibitionPhotoPicker(recipes, Object.values(media).map(asset => asset.src));

  const taste = [
    { label: "Flavors", copy: "Olive oil, saffron, smoke, salt, and the brightness of ripe produce.", recipe: pick(["paella valenciana", "paella"]) },
    { label: "Faces", copy: "Growers, fishers, market traders, home cooks, and restaurant teams.", recipe: pick(["jamon & wild garlic croquetas", "ham croquetas", "croqueta"]) },
    { label: "Fusion", copy: "A table shaped by ports, migration, exchange, and regional invention.", recipe: pick(["seafood fideua", "arroz con gambas", "spanish seafood rice"]) },
    { label: "Memories", copy: "Recipes repeated at home until gesture becomes a form of archive.", recipe: pick(["churros", "spanish fig & almond balls"]) },
  ].filter((item) => item.recipe);

  const essentials = [
    { name: "Rice", hint: "A landscape as much as an ingredient", recipe: pick(["arroz al horno", "arroz con gambas", "paella valenciana"]) },
    { name: "Olive oil", hint: "The beginning of countless preparations", recipe: pick(["ajo blanco"]) },
    { name: "Tomato", hint: "Fresh, grated, simmered, or chilled", recipe: pick(["quick gazpacho", "spanish tomato bread"]) },
    { name: "Seafood", hint: "Coasts translated into pans and stews", recipe: pick(["seafood fideua", "spanish seafood rice", "arroz con gambas"]) },
    { name: "Egg", hint: "The quiet architecture of tortilla", recipe: pick(["spanish tortilla", "salt cod tortilla"]) },
  ].filter((item) => item.recipe);

  const histories = [
    { label: "Vegetables", title: "The garden sets the season", copy: "Peppers, tomatoes, beans, artichokes, and greens turn local calendars into everyday cooking.", recipe: pick(["quick gazpacho", "ajo blanco", "chorizo & tomato salad"]) },
    { label: "Meat & poultry", title: "Preservation becomes character", copy: "Curing, stewing, roasting, and cooking over fire carry regional knowledge into the present.", recipe: pick(["spanish-style slow-cooked lamb", "spanish chicken", "spanish meatballs"]) },
    { label: "Fish & coast", title: "The sea arrives by market", copy: "Fresh catch, salt cod, shellfish, and preserved seafood tell different coastal stories.", recipe: pick(["seafood fideua", "salt cod tortilla", "spanish seafood rice"]) },
  ].filter((item) => item.recipe);

  const flavors = [
    { name: "Olive oil", note: "Fruit, bitterness, pepper, and place", recipe: pick(["ajo blanco", "spanish tomato bread"]) },
    { name: "Tapas", note: "A way of moving through a city together", recipe: pick(["patatas bravas", "ham croquetas"]) },
    { name: "Jamón", note: "Time and climate made visible", recipe: pick(["jamón serrano", "jamon & wild garlic croquetas"]) },
    { name: "Saffron", note: "A small ingredient with a long trail", recipe: pick(["chicken with saffron", "paella valenciana"]) },
    { name: "Sweets", note: "Celebration written in dough and sugar", recipe: pick(["churros", "arroz con leche"]) },
    { name: "Preserved sea", note: "Tins, salt, and the intelligence of keeping", recipe: pick(["salt cod tortilla", "seafood fideua"]) },
  ].filter((item) => item.recipe);

  return (
    <main className={styles.page} data-exhibition>
      <Header />
      <article>
        <header className={styles.hero}>
          <div className={styles.heroImage}>
            <Image src={localImage(media.paella.src)} alt={media.paella.alt} fill priority sizes="100vw" />
            <a href={media.paella.source} target="_blank" rel="noreferrer noopener">{media.paella.credit} ↗</a>
          </div>
          <div className={styles.heroCopy}>
            <p>Spanish gastronomy · A living exhibition</p>
            <h1>Spain, served in many voices.</h1>
            <p>Travel from olive groves and fishing ports to market counters and family notebooks. This is not one national menu, but a conversation between landscapes, techniques, people, and memory.</p>
          </div>
        </header>

        <section className={styles.taste} id="taste" aria-labelledby="taste-title">
          <header className={styles.centerHeading}>
            <p>A taste of Spain</p>
            <h2 id="taste-title">Four ways into a many-sided food culture</h2>
            <span>Move through flavor, people, exchange, and remembrance.</span>
          </header>
          {taste.length ? (
            <div className={styles.tasteRail}>
              {taste.map(({ label, copy, recipe }) => (
                <Link href={`/recipes/${recipe!.slug}`} key={label}>
                  <span><RecipeImage recipe={recipe!} sizes="(max-width: 760px) 84vw, 25vw" /></span>
                  <strong>{label}</strong>
                  <small>{copy}</small>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className={styles.landscape} aria-labelledby="landscape-title">
          <div className={styles.culturalImage}>
            <Image src={localImage(media.oliveHarvest.src)} alt={media.oliveHarvest.alt} fill sizes="(max-width: 850px) 100vw, 56vw" />
            <a href={media.oliveHarvest.source} target="_blank" rel="noreferrer noopener">{media.oliveHarvest.credit} ↗</a>
          </div>
          <div className={styles.landscapeCopy}>
            <p>Landscape is an ingredient</p>
            <h2 id="landscape-title">The pantry begins outdoors.</h2>
            <p>Rice wetlands, dry inland fields, olive groves, mountain pastures, islands, and fishing ports create distinct local logics. Geography is not decoration around the recipe—it helps explain why the recipe exists.</p>
          </div>
        </section>

        <section className={styles.essentials} aria-labelledby="essentials-title">
          <header className={styles.splitHeading}>
            <div><p>Kitchen essentials</p><h2 id="essentials-title">Can you read a dish from its ingredients?</h2></div>
            <span>Focus or hover to open each pantry note. Every strip also links to a published recipe.</span>
          </header>
          {essentials.length ? (
            <div className={styles.essentialRail}>
              {essentials.map(({ name, hint, recipe }) => (
                <Link href={`/recipes/${recipe!.slug}`} key={name}>
                  <RecipeImage recipe={recipe!} sizes="(max-width: 760px) 88vw, 28vw" />
                  <i aria-hidden="true" />
                  <span><strong>{name}</strong><small>{hint}</small></span>
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className={styles.people} aria-labelledby="people-title">
          <div className={styles.peopleCopy}>
            <p>Guardians of everyday knowledge</p>
            <h2 id="people-title">A cuisine survives because people keep practicing it.</h2>
            <p>Farmers judge a harvest, fishers read weather, vendors know what is best today, and home cooks notice when a texture is right. Restaurants matter, but food culture also lives in ordinary work repeated with care.</p>
          </div>
          <div className={styles.peopleImage}>
            <Image src={localImage(media.market.src)} alt={media.market.alt} fill sizes="(max-width: 850px) 100vw, 55vw" />
            <a href={media.market.source} target="_blank" rel="noreferrer noopener">{media.market.credit} ↗</a>
          </div>
        </section>

        <section className={styles.notebook} aria-labelledby="notebook-title">
          <div className={styles.notebookIntro}>
            <p>The joy of a handmade cookbook</p>
            <h2 id="notebook-title">Recipes become personal in the margins.</h2>
            <p>A handwritten book records more than quantities. Substitutions, stains, crossed-out timings, and a relative&apos;s shorthand show how a dish was actually lived.</p>
          </div>
          <blockquote>
            <span>para recordar</span>
            “A little less water next time. Let the pan rest before everyone arrives.”
            <cite>— an imagined kitchen margin, used here as an editorial device</cite>
          </blockquote>
        </section>

        <section className={styles.histories} aria-labelledby="histories-title">
          <header className={styles.centerHeading}>
            <p>Every recipe has a history</p>
            <h2 id="histories-title">Ingredients carry time as well as flavor.</h2>
            <span>Three routes through the published Savora archive.</span>
          </header>
          <div className={styles.historyList}>
            {histories.map(({ label, title, copy, recipe }) => (
              <article key={label}>
                <Link href={`/recipes/${recipe!.slug}`} className={styles.historyImage}>
                  <RecipeImage recipe={recipe!} sizes="(max-width: 850px) 100vw, 56vw" />
                </Link>
                <div><p>{label}</p><h3>{title}</h3><span>{copy}</span><Link href={`/recipes/${recipe!.slug}`}>Open {recipe!.title} <b aria-hidden="true">→</b></Link></div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.flavors} aria-labelledby="flavors-title">
          <header className={styles.splitHeading}>
            <div><p>Flavors</p><h2 id="flavors-title">Six signatures to follow</h2></div>
            <span>Not a checklist of “authentic Spain,” but a set of doors into local craft, preservation, sociability, and celebration.</span>
          </header>
          <div className={styles.flavorGrid}>
            {flavors.map(({ name, note, recipe }) => (
              <Link href={`/recipes/${recipe!.slug}`} key={name}>
                <span><RecipeImage recipe={recipe!} sizes="(max-width: 640px) 92vw, (max-width: 1000px) 45vw, 31vw" /></span>
                <strong>{name}</strong><small>{note}</small>
              </Link>
            ))}
          </div>
        </section>

      </article>
      <Footer />
    </main>
  );
}
