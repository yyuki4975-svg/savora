import Image from "next/image";
import Link from "next/link";
import { Footer, Header } from "./ui";
import { T } from "./i18n";
import { ErrorScene } from "./error-scene";
import {
  loadPublishedDiscoveryCatalog,
  type DiscoveryRecipe,
} from "../lib/api/published-discovery";
import styles from "./home.module.css";

type PlacePath = {
  slug: string;
  name: string;
  image: string;
  count: number;
};

// Each place keeps the first photo no other part of the page already shows.
function placePaths(recipes: DiscoveryRecipe[], shown: Set<string> = new Set()): PlacePath[] {
  const places = new Map<string, PlacePath & { images: string[] }>();
  for (const recipe of recipes) {
    if (!recipe.place || !recipe.placeSlug) continue;
    const existing = places.get(recipe.placeSlug);
    if (existing) {
      existing.count += 1;
      existing.images.push(recipe.image);
    } else places.set(recipe.placeSlug, {
      slug: recipe.placeSlug,
      name: recipe.place,
      image: recipe.image,
      images: [recipe.image],
      count: 1,
    });
  }
  return [...places.values()]
    .sort((first, second) => second.count - first.count || first.name.localeCompare(second.name))
    .slice(0, 5)
    .map(({ images, ...place }) => {
      const image = images.find((candidate) => !shown.has(candidate)) ?? place.image;
      shown.add(image);
      return { ...place, image };
    });
}

// Existing Explore filters; every link lands on results that are already filtered.
const cravings = [
  { key: "tomato", query: "ingredient=tomato" },
  { key: "rice", query: "ingredient=rice" },
  { key: "chile", query: "ingredient=chile" },
  { key: "fish", query: "ingredient=fish" },
  { key: "herbs", query: "ingredient=herbs" },
  { key: "citrus", query: "ingredient=citrus" },
  { key: "soup", query: "category=soup" },
  { key: "vegetable", query: "category=vegetable" },
] as const;

function RecipeMeta({ recipe }: { recipe: DiscoveryRecipe }) {
  return (
    <span className={styles.meta}>
      <span>{recipe.place ?? recipe.country ?? recipe.category}</span>
      {recipe.totalMinutes ? <span translate="no"><T k="front.minutes" vars={{ count: recipe.totalMinutes }} /></span> : null}
      {recipe.sourceName ? <span translate="no"><T k="front.source" vars={{ name: recipe.sourceName }} /></span> : null}
    </span>
  );
}

function StateView({ unavailable, preview }: { unavailable: boolean; preview: boolean }) {
  return (
    <main className={styles.page}>
      <Header />
      <ErrorScene kind="unavailable" title={<T k={unavailable ? "front.pauseTitle" : "front.emptyTitle"} />} message={<T k={unavailable ? "front.pauseCopy" : "front.emptyCopy"} />} back={preview ? { href: "/phase-3/home-preview", label: "Back to home" } : { href: "/skills", label: "Kitchen skills" }} />
      <Footer />
    </main>
  );
}

export async function HomeExperience({ preview = false }: { preview?: boolean }) {
  // The page stays server-rendered; the first-party projection admits only Published records
  // with reviewed media and source evidence. https://nextjs.org/docs/app/getting-started/fetching-data
  const result = await loadPublishedDiscoveryCatalog();
  if (result.status !== "ok") return <StateView unavailable={result.status === "error"} preview={preview} />;

  const recipes = result.recipes;
  const shown = new Set<string>();
  const take = (pool: DiscoveryRecipe[], wanted: (recipe: DiscoveryRecipe) => boolean = () => true) => {
    const recipe = pool.find((candidate) => !shown.has(candidate.image) && wanted(candidate)) ?? pool.find((candidate) => !shown.has(candidate.image));
    if (recipe) shown.add(recipe.image);
    return recipe;
  };
  const storied = (recipe: DiscoveryRecipe) => Boolean(recipe.culturalNote && recipe.place);
  const lead = take(recipes, storied) ?? recipes[0];
  const remaining = recipes.filter((recipe) => recipe.slug !== lead.slug);
  // The hero arcade: the lead dish plus four more, each from a different named place.
  const placesOnTable = new Set([lead.place ?? lead.country]);
  const plates = [lead, ...[0, 1, 2, 3].map(() => {
    const recipe = take(remaining, (candidate) => Boolean(candidate.place) && !placesOnTable.has(candidate.place!));
    if (recipe) placesOnTable.add(recipe.place ?? recipe.country);
    return recipe;
  })].filter((recipe): recipe is DiscoveryRecipe => Boolean(recipe));
  const focus = take(remaining, storied);
  const rail = [0, 1, 2]
    .map(() => take(remaining.filter((recipe) => recipe.slug !== focus?.slug)))
    .filter((recipe): recipe is DiscoveryRecipe => Boolean(recipe));
  const places = placePaths(recipes, shown);
  const exploreHref = preview ? "/phase-3/explore-preview" : "/explore";

  return (
    <main className={styles.page}>
      <Header />

      <section className={styles.hero} aria-labelledby="home-title">
        <div className={styles.heroCopy} translate="no">
          <h1 id="home-title"><T k="front.title" /></h1>
          <p><T k="front.deck" /></p>
          <div className={styles.heroActions}>
            <Link className={styles.filledAction} href={preview ? "/phase-3/explore-preview" : "/explore"}><T k="front.find" /></Link>
            <Link className={styles.textAction} href="/share"><T k="front.share" /></Link>
          </div>
        </div>
        <ul className={styles.plates}>
          {plates.map((recipe, index) => (
            <li className={styles[`plate${index + 1}`]} key={recipe.slug}>
              <Link className={styles.plate} href={`/recipes/${recipe.slug}`} aria-label={recipe.title}>
                {/* Only the lead plate is preloaded; every fill image declares responsive sizes.
                    https://nextjs.org/docs/app/api-reference/components/image#preload */}
                <span className={styles.plateImage}><Image src={recipe.image} alt={recipe.alt} fill preload={index === 0} loading={index === 0 ? undefined : "eager"} sizes={index < 3 ? "(max-width: 900px) 34vw, 20vw" : "(max-width: 900px) 24vw, 11vw"} /></span>
              </Link>
            </li>
          ))}
        </ul>
        <svg className={`${styles.seedMark} ${styles.top}`} viewBox="0 0 80 80" aria-hidden="true"><ellipse cx="22" cy="46" rx="10" ry="15" transform="rotate(-28 22 46)" fill="var(--sv-clay)" /><ellipse cx="44" cy="22" rx="10" ry="15" transform="rotate(32 44 22)" fill="var(--sv-honey)" /><ellipse cx="56" cy="56" rx="10" ry="15" transform="rotate(-62 56 56)" fill="var(--sv-leaf)" /></svg>
      </section>

      <nav className={styles.cravings} aria-labelledby="cravings-title" translate="no">
        <h2 id="cravings-title"><T k="front.chooser" /></h2>
        <ul>
          {cravings.map((item) => (
            <li key={item.key}><Link href={`${exploreHref}?${item.query}#explore-controls`}><T k={`front.c.${item.key}`} /></Link></li>
          ))}
        </ul>
      </nav>

      {focus ? (
        <section className={styles.next} aria-labelledby="next-title">
          <div className={styles.sectionHead} translate="no">
            <h2 id="next-title"><T k="front.next" /></h2>
            <Link href={exploreHref}><T k="front.all" vars={{ count: recipes.length }} /> <span aria-hidden="true">→</span></Link>
          </div>
          <div className={styles.nextGrid}>
            <article className={styles.feature}>
              <Link href={`/recipes/${focus.slug}`}>
                <span className={styles.featureImage}><Image src={focus.image} alt={focus.alt} fill sizes="(max-width: 900px) 100vw, 56vw" /></span>
                <h3>{focus.title}</h3>
                {focus.culturalNote ? <p>{focus.culturalNote}</p> : null}
                <RecipeMeta recipe={focus} />
              </Link>
            </article>
            <div className={styles.nextList}>
              {rail.map((recipe) => (
                <article key={recipe.slug}>
                  <Link href={`/recipes/${recipe.slug}`}>
                    <span className={styles.listImage}><Image src={recipe.image} alt={recipe.alt} fill sizes="(max-width: 900px) 40vw, 16vw" /></span>
                    <span className={styles.listCopy}>
                      <h3>{recipe.title}</h3>
                      <RecipeMeta recipe={recipe} />
                    </span>
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className={styles.seasonal} aria-labelledby="autumn-home-title">
        <Link className={styles.seasonalImage} href="/stories/autumn-table" tabIndex={-1} aria-hidden="true">
          <Image src="https://img.mingchu.co/Nuploads/NewsImage/5ba46cbc4ede8.jpg" alt="" fill quality={90} sizes="100vw" />
        </Link>
        <div className={styles.seasonalCopy} translate="no">
          <p><T k="front.autumnKicker" /></p>
          <h2 id="autumn-home-title"><T k="front.autumnTitle" /></h2>
          <p><T k="front.autumnCopy" /></p>
          <Link href="/stories/autumn-table"><T k="front.autumnLink" /> <span aria-hidden="true">→</span></Link>
        </div>
      </section>

      {places.length ? (
        <section className={styles.places} aria-labelledby="place-title">
          <div className={styles.sectionHead} translate="no">
            <h2 id="place-title"><T k="front.places" /></h2>
            <Link href="/world-map"><T k="front.map" /> <span aria-hidden="true">→</span></Link>
          </div>
          <div className={styles.placeGrid}>
            {places.map((place) => (
              <Link href={`/places/${place.slug}`} key={place.slug}>
                <span className={styles.placeImage}><Image src={place.image} alt="" fill sizes="(max-width: 620px) 46vw, (max-width: 1050px) 30vw, 19vw" /></span>
                <span className={styles.placeCopy}>
                  <strong>{place.name}</strong>
                  <small translate="no">{place.count === 1 ? <T k="front.recipe" /> : <T k="front.recipes" vars={{ count: place.count }} />}</small>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Real notes live on the Community page and on each recipe; Home only invites. */}
      <section className={styles.together} aria-labelledby="pass-title">
        <div className={styles.togetherInner}>
          <aside className={styles.pass} translate="no">
            <div>
              <h2 id="pass-title"><T k="front.pass" /></h2>
              <p><T k="front.passCopy" /></p>
            </div>
            <div>
              <ol>
                <li><T k="front.step1" /></li>
                <li><T k="front.step2" /></li>
                <li><T k="front.step3" /></li>
              </ol>
              <div className={styles.passLinks}>
                <Link href="/share"><T k="nav.share" /></Link>
                <Link href="/community"><T k="front.join" /> <span aria-hidden="true">→</span></Link>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className={styles.kitchen} aria-labelledby="kitchen-title" translate="no">
        <div>
          <h2 id="kitchen-title"><T k="front.kitchen" /></h2>
          <p><T k="front.kitchenCopy" /></p>
        </div>
        <ul>
          <li><Link href="/recipe-box"><T k="footer.recipeBox" /> <span aria-hidden="true">→</span></Link></li>
          <li><Link href="/meal-planner"><T k="footer.planner" /> <span aria-hidden="true">→</span></Link></li>
          <li><Link href="/grocery-list"><T k="footer.grocery" /> <span aria-hidden="true">→</span></Link></li>
          <li><Link href="/pantry"><T k="footer.pantry" /> <span aria-hidden="true">→</span></Link></li>
        </ul>
      </section>

      {preview ? <aside className={styles.review} aria-label="Preview status">
        <span>Phase 3 · Homepage preview · Published API catalog</span>
        <Link href="/phase-3/catalog-preview">Catalog evidence</Link>
        <Link href="/phase-3/explore-preview">Explore preview</Link>
        <Link href="/phase-3/story-preview/paella-valenciana">Story preview</Link>
      </aside> : null}
      <Footer />
    </main>
  );
}
