import vinext from "vinext";
import { defineConfig } from "vite";
import nextConfig from "./next.config.ts";

// Separate self-hosted target. The existing Cloudflare config and page source
// remain unchanged. Build ONLY in the allowlisted, isolated deployment context:
// Vinext's standalone lifecycle writes to <root>/dist.
// https://github.com/cloudflare/vinext/blob/vinext%401.0.1/README.md
if (process.env.SAVORA_ISOLATED_NODE_BUILD !== "true") {
  throw new Error("Prepare an isolated Node deployment context before building.");
}

export default defineConfig({
  plugins: [vinext({ nextConfig: { ...nextConfig, output: "standalone" } })],
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
    // Operator/Draft surfaces never become public through a runtime flag.
    "process.env.SAVORA_DRAFT_CATALOG_ENABLED": JSON.stringify("false"),
  },
});
