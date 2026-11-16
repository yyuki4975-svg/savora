// Vite bundles MapLibre's module worker and returns its URL (see map-canvas.tsx).
declare module "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url" {
  const url: string;
  export default url;
}
