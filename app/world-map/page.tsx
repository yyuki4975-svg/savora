import { loadPublishedMap } from "../../lib/api/published-map";
import { CatalogApiStatus } from "../catalog-api-status";
import { Footer, Header } from "../ui";
import { WorldMapExperience } from "./map-experience";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { MAP_OVERVIEW_URL, MAP_OVERVIEW_INTEGRITY } from "./map-overview";

// Fetch, but do not execute, the public worker module while the initial route
// loads. Worker startup otherwise discovers it only after map hydration.
// https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/modulepreload
const workerModule = process.env.NEXT_PUBLIC_SAVORA_ASSET_ORIGIN === "https://assets.cookwsavora.com" &&
  /^\/_next\/static\/workers\/maplibre-v2-[a-f0-9]{20}-entry\.js$/.test(workerUrl)
  ? "https://assets.cookwsavora.com" + workerUrl.replace(/-entry\.js$/, ".js")
  : !process.env.NEXT_PUBLIC_SAVORA_ASSET_ORIGIN && /^\/_next\/static\/workers\/maplibre-v2-[a-f0-9]{20}\.js$/.test(workerUrl)
    ? workerUrl : undefined;

export const metadata = { title: "World food map", description: "Explore culinary cities, regional traditions, and curated food journeys on Savora." };

export default async function WorldMapPage() {
  const result = await loadPublishedMap();
  if (result.status !== "ok") {
    return (
      <main>
        <Header />
        <CatalogApiStatus
          message={result.status === "error" ? result.message : "Published places will appear after their recipes and coordinates are reviewed."}
          backHref="/explore"
          backLabel="Return to Explore"
        />
        <Footer />
      </main>
    );
  }

  return <>
    <link rel="preload" href={MAP_OVERVIEW_URL} as="fetch" crossOrigin="anonymous" integrity={MAP_OVERVIEW_INTEGRITY} />
    {workerModule ? <link rel="modulepreload" href={workerModule} crossOrigin="anonymous" /> : null}
    <WorldMapExperience places={result.places} countries={result.countries} />
  </>;
}
