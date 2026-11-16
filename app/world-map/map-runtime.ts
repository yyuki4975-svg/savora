// Public map resources only. Keep one bounded PMTiles directory cache and worker
// pool for repeat SPA visits; do not initialize maps on unrelated pages.
import { isBuiltinBasemap, cacheMapRanges } from "./map-range-cache";
// Required on the initial map route, not a second post-hydration download.
// https://nextjs.org/docs/app/guides/lazy-loading
import * as maplibre from "maplibre-gl";
import * as pmtiles from "pmtiles";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { atlasStyle, basemapUrl } from "./atlas-style";
import { loadMapOverview } from "./map-overview";
type MapRuntime = { maplibre: typeof import("maplibre-gl"); atlasStyle: typeof import("./atlas-style").atlasStyle };
let runtime: Promise<MapRuntime> | undefined;

export function loadMapRuntime(): Promise<MapRuntime> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser map runtime required"));
  if (runtime) return runtime;
  runtime = (async () => {
    const protocol = new pmtiles.Protocol();
    const base = basemapUrl();
    const url = new URL(base, window.location.href).href;
    const source = isBuiltinBasemap(base) ? cacheMapRanges(new pmtiles.FetchSource(url), loadMapOverview()) : url;
    const archive = new pmtiles.PMTiles(source, new pmtiles.SharedPromiseCache(32));
    protocol.add(archive);
    void archive.getHeader().then(() => {
      // One 67 KB world tile, not a speculative high-zoom/archive download.
      if (isBuiltinBasemap(base)) return archive.getZxy(0, 0, 0);
    }).catch(() => { /* MapLibre's existing error UI handles unavailable basemaps. */ });
    maplibre.setWorkerUrl(workerUrl);
    maplibre.addProtocol("pmtiles", protocol.tile);
    // Official SPA support: retain the existing shared worker between map visits.
    maplibre.prewarm();
    return { maplibre, atlasStyle };
  })().catch(error => { runtime = undefined; throw error; });
  return runtime;
}
