"use client";

import { useEffect, useRef, useState } from "react";
import type { PublishedMapCountry, PublishedMapPlace } from "../../lib/api/published-map";
import "maplibre-gl/dist/maplibre-gl.css";
import styles from "./world-map-passed-bowl.module.css";
import { loadMapRuntime } from "./map-runtime";

export type MapSelection = { kind: "country" | "place"; slug: string };

// Country plates grow with the square root of their recipe count, so one large catalogue
// does not swallow its neighbours.
function plateSize(count: number) {
  return Math.round(Math.min(72, 24 + Math.sqrt(count) * 2.6));
}

const wideCountries = new Set(["russia", "canada", "united-states", "china", "brazil", "australia", "india", "argentina"]);

function currentTheme(): "light" | "dark" {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function countryElement(country: PublishedMapCountry, onClick: () => void) {
  const shell = document.createElement("button");
  shell.type = "button";
  shell.className = "savora-country-shell";
  shell.setAttribute("aria-label", `${country.name}: ${country.recipeCount} recipes`);
  shell.tabIndex = -1;
  const size = plateSize(country.recipeCount);
  const plate = document.createElement("span");
  plate.className = "savora-country-plate";
  plate.style.setProperty("--size", `${size}px`);
  const count = document.createElement("b");
  count.textContent = String(country.recipeCount);
  plate.append(count);
  const name = document.createElement("small");
  name.className = "savora-country-name";
  name.textContent = country.name;
  shell.append(plate, name);
  shell.addEventListener("click", (event) => { event.stopPropagation(); onClick(); });
  return shell;
}

function placeElement(place: PublishedMapPlace, onClick: () => void) {
  const shell = document.createElement("button");
  shell.type = "button";
  shell.className = "savora-atlas-marker-shell";
  shell.setAttribute("aria-label", `${place.name}, ${place.country}`);
  shell.tabIndex = -1;
  const marker = document.createElement("span");
  marker.className = "savora-atlas-marker";
  const dot = document.createElement("i");
  const name = document.createElement("small");
  name.textContent = place.name;
  marker.append(dot, name);
  shell.append(marker);
  shell.addEventListener("click", (event) => { event.stopPropagation(); onClick(); });
  return shell;
}

export function MapCanvas({
  places,
  countries,
  selection,
  onSelect,
}: {
  places: PublishedMapPlace[];
  countries: PublishedMapCountry[];
  selection: MapSelection | null;
  onSelect: (selection: MapSelection) => void;
}) {
  const mapNode = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<import("maplibre-gl").Map | null>(null);
  const markerIndex = useRef<Map<string, import("maplibre-gl").Marker>>(new Map());
  const selectedRef = useRef<MapSelection | null>(selection);
  const [basemapMissing, setBasemapMissing] = useState(false);
  useEffect(() => { selectedRef.current = selection; }, [selection]);

  useEffect(() => {
    if (!mapNode.current) return;
    let disposed = false;
    let themeObserver: MutationObserver | null = null;

    void (async () => {
      mapNode.current?.setAttribute("data-map-status", "loading");
      const { maplibre, atlasStyle } = await loadMapRuntime();
      if (disposed || !mapNode.current) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const map = new maplibre.Map({
        container: mapNode.current,
        style: atlasStyle(currentTheme()),
        center: [14, 24],
        zoom: 1.2,
        minZoom: 0.8,
        maxZoom: 9,
        renderWorldCopies: true,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        fadeDuration: reduceMotion ? 0 : 200,
      });
      map.once("load", () => {
        if (!disposed) mapNode.current?.setAttribute("data-map-status", "ready");
      });
      map.touchZoomRotate.disableRotation();
      map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-left");
      map.on("error", (event) => {
        const message = String(event.error?.message ?? "");
        if (/pmtiles|404|Failed to fetch|Unimplemented type|magic number/i.test(message)) setBasemapMissing(true);
      });

      const nextMarkers = new Map<string, import("maplibre-gl").Marker>();
      countries.forEach((country) => {
        const marker = new maplibre.Marker({ element: countryElement(country, () => onSelect({ kind: "country", slug: country.slug })), anchor: "center" })
          .setLngLat([country.longitude, country.latitude]).addTo(map);
        nextMarkers.set(`country:${country.slug}`, marker);
      });
      places.forEach((place) => {
        const marker = new maplibre.Marker({ element: placeElement(place, () => onSelect({ kind: "place", slug: place.slug })), anchor: "center" })
          .setLngLat([place.longitude, place.latitude]).addTo(map);
        nextMarkers.set(`place:${place.slug}`, marker);
      });
      const current = selectedRef.current;
      if (current) nextMarkers.get(`${current.kind}:${current.slug}`)?.getElement().classList.add("is-selected");

      // City names appear once the map is close enough to read them.
      const syncZoom = () => mapNode.current?.setAttribute("data-zoom", map.getZoom() >= 3.5 ? "near" : "far");
      map.on("zoomend", syncZoom);
      syncZoom();

      // Follow the site theme without rebuilding markers.
      themeObserver = new MutationObserver(() => map.setStyle(atlasStyle(currentTheme())));
      themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

      markerIndex.current = nextMarkers;
      mapInstance.current = map;
    })();

    return () => {
      disposed = true;
      themeObserver?.disconnect();
      mapInstance.current?.remove();
      mapInstance.current = null;
      markerIndex.current = new Map();
    };
  }, [onSelect, places, countries]);

  useEffect(() => {
    const key = selection ? `${selection.kind}:${selection.slug}` : "";
    markerIndex.current.forEach((marker, markerKey) => {
      const element = marker.getElement();
      element.classList.toggle("is-selected", markerKey === key);
      element.style.zIndex = markerKey === key ? "3" : markerKey.startsWith("place:") ? "2" : "1";
    });
    const map = mapInstance.current;
    if (!selection || !map) return;
    const target = selection.kind === "place"
      ? places.find((candidate) => candidate.slug === selection.slug)
      : countries.find((candidate) => candidate.slug === selection.slug);
    if (!target) return;
    const zoom = selection.kind === "place" ? 6 : wideCountries.has(selection.slug) ? 2.6 : 4;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // On wide screens the place panel floats over the right of the map; keep targets clear of it.
    const wide = (mapNode.current?.clientWidth ?? 0) > 980;
    const padding = wide ? { top: 40, bottom: 40, left: 40, right: 460 } : { top: 20, bottom: 20, left: 20, right: 20 };
    map.flyTo({ center: [target.longitude, target.latitude], zoom, padding, duration: reduceMotion ? 0 : 1100, essential: false });
  }, [places, countries, selection]);

  return (
    <div className={styles.mapFrame}>
      <div
        ref={mapNode}
        className={styles.mapCanvas}
        role="region"
        aria-label="Interactive map of published Savora recipes by country and city. Use the index below the map for a keyboard-accessible alternative."
      />
      <span className={styles.mapSource}>{basemapMissing ? "Basemap file unavailable; markers still work" : "Country positions are approximate"}</span>
    </div>
  );
}
