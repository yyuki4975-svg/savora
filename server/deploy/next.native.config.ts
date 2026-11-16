// Isolated Docker context only: the canonical config is copied under this name.
// https://nextjs.org/docs/app/api-reference/config/next-config-js/output
import shared from "./next.shared.config";
import type { NextConfig } from "next";

// Public build inputs only, never a caller-selected or credential-bearing origin.
// https://nextjs.org/docs/app/api-reference/config/next-config-js/assetPrefix
const assetOrigin = process.env.SAVORA_PUBLIC_ASSET_ORIGIN || undefined;
if (assetOrigin && assetOrigin !== "https://assets.cookwsavora.com") throw new Error("Unapproved public asset origin");
const config: NextConfig = {
  ...shared,
  assetPrefix: assetOrigin,
  crossOrigin: "anonymous",
  env: { NEXT_PUBLIC_SAVORA_ASSET_ORIGIN: assetOrigin || "" },
  output: "standalone",
  poweredByHeader: false,
  images: {
    ...shared.images,
    maximumResponseBody: 20 * 1024 ** 2,
    // Only optimized public images use the persistent production cache mount.
    maximumDiskCacheSize: 384 * 1024 ** 2,
  },
  experimental: {
    cpus: 1,
    webpackMemoryOptimizations: true,
    imgOptConcurrency: 1,
    imgOptMaxInputPixels: 32 * 1024 ** 2,
    imgOptTimeoutInSeconds: 8,
  },
  headers() {
    return [
      { source: "/_next/image", headers: [{ key: "X-Content-Type-Options", value: "nosniff" }] },
      {
        source: "/maps/savora-overview-4470ed328f6daebee113d990812de6748cec649566e09929d32e5469a01883e8.bin",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  webpack(configuration) {
    // Bundle the worker's shared-module dependencies, not just its entry URL.
    configuration.module.rules.push({
      test: /maplibre-gl-worker\.mjs$/,
      resourceQuery: /worker&url/,
      type: "javascript/auto",
      use: [{ loader: `${process.cwd()}/server/deploy/native-worker-url.cjs` }],
    });
    return configuration;
  },
};
export default config;
