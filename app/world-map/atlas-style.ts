import type { StyleSpecification } from "maplibre-gl";
import { BUILTIN_BASEMAP, CDN_BASEMAP } from "./map-range-cache";

// Savora's own basemap style for the Protomaps v4 vector schema (earth, water, landcover,
// landuse, roads, boundaries). No basemap labels or glyph downloads: Savora's country plates
// and city pins carry the names. Colours are the Passed Bowl tokens (app/savora-system.css).

type Palette = { water: string; earth: string; landcover: string; park: string; urban: string; border: string; region: string; road: string };

const light: Palette = { water: "#dfe4d6", earth: "#faf5e9", landcover: "#efe6d2", park: "#e3e6cc", urban: "#ece2cc", border: "#a8482c", region: "#d9d0ba", road: "#e2d6bb" };
const dark: Palette = { water: "#141914", earth: "#222a22", landcover: "#252e25", park: "#26301f", urban: "#29312a", border: "#e08c6c", region: "#3a443a", road: "#323c32" };

export function basemapUrl() {
  // Local development serves the extract from public/maps; production points this at the
  // approved object store (Cloudflare R2), never at the Protomaps build server.
  return process.env.NEXT_PUBLIC_SAVORA_BASEMAP_URL ||
    (process.env.NEXT_PUBLIC_SAVORA_ASSET_ORIGIN === "https://assets.cookwsavora.com" ? CDN_BASEMAP : BUILTIN_BASEMAP);
}

export function atlasStyle(theme: "light" | "dark"): StyleSpecification {
  const c = theme === "dark" ? dark : light;
  return {
    version: 8,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${new URL(basemapUrl(), window.location.href).href}`,
        attribution: '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": c.water } },
      { id: "earth", type: "fill", source: "protomaps", "source-layer": "earth", paint: { "fill-color": c.earth } },
      {
        id: "landcover", type: "fill", source: "protomaps", "source-layer": "landcover",
        filter: ["in", ["get", "kind"], ["literal", ["forest", "scrub", "grassland", "farmland"]]],
        paint: { "fill-color": c.landcover, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 0, 0.55, 6, 0.8] },
      },
      {
        id: "landuse-park", type: "fill", source: "protomaps", "source-layer": "landuse", minzoom: 5,
        filter: ["in", ["get", "kind"], ["literal", ["park", "nature_reserve", "national_park", "forest", "wood"]]],
        paint: { "fill-color": c.park, "fill-opacity": 0.7 },
      },
      {
        id: "landuse-urban", type: "fill", source: "protomaps", "source-layer": "landuse", minzoom: 5,
        filter: ["in", ["get", "kind"], ["literal", ["residential", "commercial", "industrial", "urban_area"]]],
        paint: { "fill-color": c.urban, "fill-opacity": 0.8 },
      },
      { id: "water", type: "fill", source: "protomaps", "source-layer": "water", paint: { "fill-color": c.water } },
      {
        id: "roads-major", type: "line", source: "protomaps", "source-layer": "roads", minzoom: 5,
        filter: ["in", ["get", "kind"], ["literal", ["highway", "major_road"]]],
        paint: { "line-color": c.road, "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.4, 9, 1.6] },
      },
      {
        id: "boundaries-region", type: "line", source: "protomaps", "source-layer": "boundaries", minzoom: 4,
        filter: ["==", ["get", "kind"], "region"],
        paint: { "line-color": c.region, "line-width": 0.6, "line-dasharray": [2, 2] },
      },
      {
        id: "boundaries-country", type: "line", source: "protomaps", "source-layer": "boundaries",
        filter: ["==", ["get", "kind"], "country"],
        paint: { "line-color": c.border, "line-opacity": 0.32, "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.5, 6, 1.2] },
      },
    ],
  };
}
