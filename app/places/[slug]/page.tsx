import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogApiStatus } from "../../catalog-api-status";
import { Footer, Header } from "../../ui";
import { getPlace, isCatalogApiEnabled } from "../../../lib/api/savora-client";
import { countryForPlaceSlug, loadPublishedDiscoveryCatalog } from "../../../lib/api/published-discovery";
import styles from "./place.module.css";

type PlacePageProps = { params: Promise<{ slug: string }> };

const placeKinds: Record<string, string> = { Country: "Country", Region: "Region", City: "City", Town: "Town" };
// Regions that are provinces of their country.
const provinces = new Set(["taiwan"]);

export async function generateMetadata({ params }: PlacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = isCatalogApiEnabled() ? await getPlace(slug, "en") : null;
  const name = result?.status === "ok" ? result.data.name : "Place";
  return { title: `Recipes from ${name}`, description: `Published Savora recipes from ${name}, each with its place and its source.` };
}

export default async function PlacePage({ params }: PlacePageProps) {
  if (!isCatalogApiEnabled()) {
    return <main><Header /><CatalogApiStatus message="Places are unavailable for a moment. Please try again shortly." backHref="/world-map" backLabel="Return to the food map" /><Footer /></main>;
  }
  const { slug } = await params;
  const result = await getPlace(slug, "en");
  if (result.status === "not-found") notFound();
  if (result.status === "error") {
    return <main><Header /><CatalogApiStatus message="Places are unavailable for a moment. Please try again shortly." backHref="/world-map" backLabel="Return to the food map" /><Footer /></main>;
  }
  const place = result.data;
  const catalog = await loadPublishedDiscoveryCatalog();
  // Recipes tied to this place, or (for a country) to any place within it.
  const recipes = catalog.status === "ok" ? catalog.recipes.filter((recipe) => recipe.placeSlug === slug || recipe.countrySlug === slug) : [];
  const shown = recipes.slice(0, 24);
  const parent = place.type === "Country" ? null : countryForPlaceSlug(slug);
  const kind = [provinces.has(slug) ? "Province" : placeKinds[place.type], parent].filter(Boolean).join(" · ") || null;

  return (
    <main className={styles.page} data-catalog-source="api" data-website-page>
      <Header />
      <div className={styles.shell}>
        <nav className={styles.crumbs} aria-label="Breadcrumb"><Link href="/world-map">World map</Link><span aria-hidden="true">/</span><span>{place.name}</span></nav>
        <header className={styles.head}>
          {kind ? <p className={styles.kind}>{kind}</p> : null}
          <h1>{place.name}</h1>
          <p>{recipes.length === 0 ? `No published recipes from ${place.name} yet.` : recipes.length === 1 ? `One published recipe from ${place.name}, with its place and its source.` : `${recipes.length} published recipes from ${place.name}, each with its place and its source.`}</p>
          <div className={styles.actions}>
            {recipes.length > shown.length ? <Link className={styles.primary} href={`/explore?q=${encodeURIComponent(place.name)}`}>See all {recipes.length} in Explore</Link> : null}
            <Link className={styles.secondary} href="/world-map">Back to the food map</Link>
          </div>
        </header>
        {shown.length ? (
          <ul className={styles.grid}>
            {shown.map((recipe) => (
              <li key={recipe.slug}>
                <Link href={`/recipes/${recipe.slug}`}>
                  <span className={styles.image}><Image src={recipe.image} alt={recipe.alt} fill sizes="(max-width: 620px) 92vw, (max-width: 1050px) 45vw, 30vw" /></span>
                  <strong>{recipe.title}</strong>
                  {recipe.category && recipe.category !== "Reviewed recipe" ? <span>{recipe.category}</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}><Link className={styles.primary} href="/explore">Explore every recipe</Link><Link className={styles.secondary} href="/share">Share a recipe from {place.name}</Link></div>
        )}
      </div>
      <Footer />
    </main>
  );
}
