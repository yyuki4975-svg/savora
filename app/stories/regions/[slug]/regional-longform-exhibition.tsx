import Image from "next/image";
import Link from "next/link";
import type { DiscoveryRecipe } from "../../../../lib/api/published-discovery";
import type { ExhibitionMedia, RegionalLongformExhibition } from "../../../../lib/editorial/regional-longform-exhibitions";
import { createExhibitionPhotoPicker } from "../../../../lib/editorial/exhibition-photography";
import { mexicoSignatureMedia } from "../../../../lib/editorial/mexico-signature-media";
import { regionalPathMedia } from "../../../../lib/editorial/regional-path-media";
import { Footer, Header } from "../../../ui";
import styles from "./spain.module.css";
import { localImage } from "../../../../lib/media/local-media";

function RecipeImage({ recipe, sizes }: { recipe: DiscoveryRecipe; sizes: string }) {
  return <Image src={recipe.image} alt={recipe.alt} fill sizes={sizes} />;
}

/** Editorial photograph first (chosen for the path), otherwise the matched recipe photograph. */
function PathImage({ media, recipe, sizes }: { media?: ExhibitionMedia; recipe?: DiscoveryRecipe; sizes: string }) {
  if (media) return <Image src={localImage(media.src)} alt={media.alt} fill sizes={sizes} />;
  return recipe ? <RecipeImage recipe={recipe} sizes={sizes} /> : null;
}

export function RegionalLongformExhibitionPage({
  exhibition,
  recipes,
}: {
  exhibition: RegionalLongformExhibition;
  recipes: DiscoveryRecipe[];
}) {
  const signatureMedia: Readonly<Record<string, ExhibitionMedia>> = exhibition.slug === "mexico" ? mexicoSignatureMedia : {};
  const pick = createExhibitionPhotoPicker(recipes, [exhibition.hero.src,
    exhibition.landscape.media.src, exhibition.people.media.src,
    ...Object.values(signatureMedia).map(media => media.src)]);
  const pathMedia = regionalPathMedia[exhibition.slug] ?? {};
  const mapPaths = (paths: typeof exhibition.taste.paths) => paths
    .map(path => ({ ...path, media: pathMedia[path.label] as ExhibitionMedia | undefined, recipe: pick(path.terms) }));
  const taste = mapPaths(exhibition.taste.paths);
  const essentials = mapPaths(exhibition.essentials.paths);
  const histories = mapPaths(exhibition.histories.paths);
  const flavors = exhibition.flavors.paths.map(path => ({ ...path,
    media: signatureMedia[path.label] ?? pathMedia[path.label], recipe: signatureMedia[path.label] ? undefined : pick(path.terms) }));
  const credits = [exhibition.hero, exhibition.landscape.media, exhibition.people.media, ...taste, ...essentials, ...histories, ...flavors]
    .flatMap((item) => { const media = "src" in item ? item as ExhibitionMedia : item.media; return media ? [media] : []; })
    .filter((media, index, list) => list.findIndex((other) => other.src === media.src) === index);
  const pathHref = (terms: readonly string[], recipe?: DiscoveryRecipe) => recipe
    ? `/recipes/${recipe.slug}`
    : `/explore?country=${exhibition.slug}&q=${encodeURIComponent(terms[0])}`;

  return (
    <main className={styles.page} data-exhibition>
      <Header />
      <article>
        <header className={styles.hero}>
          <div className={styles.heroImage}>
            <Image src={localImage(exhibition.hero.src)} alt={exhibition.hero.alt} fill priority sizes="100vw" />
            <a href={exhibition.hero.source} target="_blank" rel="noreferrer noopener">{exhibition.hero.credit} ↗</a>
          </div>
          <div className={styles.heroCopy}>
            <p>{exhibition.eyebrow}</p>
            <h1>{exhibition.title}</h1>
            <p>{exhibition.introduction}</p>
          </div>
        </header>

        <section className={styles.taste} id="taste" aria-labelledby={`${exhibition.slug}-taste-title`}>
          <header className={styles.centerHeading}>
            <p>{exhibition.taste.label}</p>
            <h2 id={`${exhibition.slug}-taste-title`}>{exhibition.taste.title}</h2>
            <span>{exhibition.taste.copy}</span>
          </header>
          <div className={styles.tasteRail}>
            {taste.map(({ label, copy, terms, recipe, media }) => (
              <Link href={pathHref(terms, recipe)} key={label} data-no-image={!recipe && !media || undefined}>
                {media || recipe ? <span><PathImage media={media} recipe={recipe} sizes="(max-width: 760px) 84vw, 25vw" /></span> : null}
                <strong>{label}</strong>
                <small>{copy}</small>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.landscape} aria-labelledby={`${exhibition.slug}-landscape-title`}>
          <div className={styles.culturalImage}>
            <Image src={localImage(exhibition.landscape.media.src)} alt={exhibition.landscape.media.alt} fill sizes="(max-width: 850px) 100vw, 56vw" />
            <a href={exhibition.landscape.media.source} target="_blank" rel="noreferrer noopener">{exhibition.landscape.media.credit} ↗</a>
          </div>
          <div className={styles.landscapeCopy}>
            <p>{exhibition.landscape.label}</p>
            <h2 id={`${exhibition.slug}-landscape-title`}>{exhibition.landscape.title}</h2>
            <p>{exhibition.landscape.copy}</p>
          </div>
        </section>

        <section className={styles.essentials} aria-labelledby={`${exhibition.slug}-essentials-title`}>
          <header className={styles.splitHeading}>
            <div><p>{exhibition.essentials.label}</p><h2 id={`${exhibition.slug}-essentials-title`}>{exhibition.essentials.title}</h2></div>
            <span>{exhibition.essentials.copy}</span>
          </header>
          <div className={styles.essentialRail}>
            {essentials.map(({ label, copy, terms, recipe, media }) => (
              <Link href={pathHref(terms, recipe)} key={label} data-no-image={!recipe && !media || undefined}>
                {media || recipe ? <><PathImage media={media} recipe={recipe} sizes="(max-width: 760px) 88vw, 28vw" /><i aria-hidden="true" /></> : null}
                <span><strong>{label}</strong><small>{copy}</small></span>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.people} aria-labelledby={`${exhibition.slug}-people-title`}>
          <div className={styles.peopleCopy}>
            <p>{exhibition.people.label}</p>
            <h2 id={`${exhibition.slug}-people-title`}>{exhibition.people.title}</h2>
            <p>{exhibition.people.copy}</p>
          </div>
          <div className={styles.peopleImage}>
            <Image src={localImage(exhibition.people.media.src)} alt={exhibition.people.media.alt} fill sizes="(max-width: 850px) 100vw, 55vw" />
            <a href={exhibition.people.media.source} target="_blank" rel="noreferrer noopener">{exhibition.people.media.credit} ↗</a>
          </div>
        </section>

        <section className={styles.notebook} aria-labelledby={`${exhibition.slug}-memory-title`}>
          <div className={styles.notebookIntro}>
            <p>{exhibition.memory.label}</p>
            <h2 id={`${exhibition.slug}-memory-title`}>{exhibition.memory.title}</h2>
            <p>{exhibition.memory.copy}</p>
          </div>
          <blockquote>
            <span>{exhibition.memory.note}</span>
            “{exhibition.memory.quote}”
            <cite>{exhibition.memory.cite}</cite>
          </blockquote>
        </section>

        <section className={styles.histories} aria-labelledby={`${exhibition.slug}-histories-title`}>
          <header className={styles.centerHeading}>
            <p>{exhibition.histories.label}</p>
            <h2 id={`${exhibition.slug}-histories-title`}>{exhibition.histories.title}</h2>
            <span>{exhibition.histories.copy}</span>
          </header>
          <div className={styles.historyList}>
            {histories.map(({ label, copy, terms, recipe, media }) => (
              <article key={label} data-no-image={!recipe && !media || undefined}>
                {media || recipe ? <Link href={pathHref(terms, recipe)} className={styles.historyImage}>
                  <PathImage media={media} recipe={recipe} sizes="(max-width: 850px) 100vw, 56vw" />
                </Link> : null}
                <div><h3>{label}</h3><span>{copy}</span><Link href={pathHref(terms, recipe)}>{recipe ? <>Open {recipe.title}</> : <>Explore {exhibition.country}</>} <b aria-hidden="true">→</b></Link></div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.flavors} aria-labelledby={`${exhibition.slug}-flavors-title`}>
          <header className={styles.splitHeading}>
            <div><p>{exhibition.flavors.label}</p><h2 id={`${exhibition.slug}-flavors-title`}>{exhibition.flavors.title}</h2></div>
            <span>{exhibition.flavors.copy}</span>
          </header>
          <div className={styles.flavorGrid}>
            {flavors.map(({ label, copy, terms, recipe, media }) => (
              <article key={label}>
                <Link href={pathHref(terms, recipe)} data-no-image={!media && !recipe || undefined}>
                  {media || recipe ? <span>{media ? <Image src={localImage(media.src)} alt={media.alt} fill sizes="(max-width: 640px) 92vw, (max-width: 1000px) 45vw, 31vw" /> : <RecipeImage recipe={recipe!} sizes="(max-width: 640px) 92vw, (max-width: 1000px) 45vw, 31vw" />}</span> : null}
                  <strong>{label}</strong><small>{copy}</small>
                </Link>
                {media ? <a className={styles.photoCredit} href={media.source} target="_blank" rel="noreferrer noopener" translate="no">{media.credit} ↗</a> : null}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.ending} aria-labelledby={`${exhibition.slug}-ending-title`}>
          <h2 id={`${exhibition.slug}-ending-title`}>{exhibition.ending.title}</h2>
          <details className={styles.imageSources}>
            <summary>Image sources</summary>
            <ul>{credits.map((media) => <li key={media.src}><a href={media.source} target="_blank" rel="noreferrer noopener"><span>{media.alt}</span> <span translate="no">— {media.credit} ↗</span></a></li>)}</ul>
          </details>
        </section>
      </article>
      <Footer />
    </main>
  );
}
