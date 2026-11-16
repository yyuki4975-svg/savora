import vinext from "vinext";
import { defineConfig } from "vite";
import hostingConfig from "./.openai/hosting.json" with { type: "json" };
import { sites } from "./build/sites-vite-plugin.ts";

const SITE_CREATOR_PLACEHOLDER_DATABASE_ID =
  "00000000-0000-4000-8000-000000000000";

const { d1, r2 } = hostingConfig;

const isCodexSeatbeltSandbox = process.env.CODEX_SANDBOX === "seatbelt";

const localBindingConfig = {
  main: "./worker/index.ts",
  compatibility_flags: ["nodejs_compat"],
  d1_databases: d1
    ? [
        {
          binding: d1,
          database_name: "site-creator-d1",
          database_id: SITE_CREATOR_PLACEHOLDER_DATABASE_ID,
        },
      ]
    : [],
  r2_buckets: r2
    ? [
        {
          binding: r2,
          bucket_name: "site-creator-r2",
        },
      ]
    : [],
};

export default defineConfig(async () => {
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV === "development" ? "development" : "production"),
      "process.env.SAVORA_CATALOG_API_ENABLED": JSON.stringify(process.env.SAVORA_CATALOG_API_ENABLED ?? ""),
      "process.env.SAVORA_DRAFT_CATALOG_ENABLED": JSON.stringify(process.env.SAVORA_DRAFT_CATALOG_ENABLED ?? ""),
      "process.env.SAVORA_API_BASE_URL": JSON.stringify(process.env.SAVORA_API_BASE_URL ?? ""),
      "process.env.SAVORA_ACCOUNT_API_ENABLED": JSON.stringify(process.env.SAVORA_ACCOUNT_API_ENABLED ?? "false"),
      "process.env.SAVORA_ACCOUNT_API_BASE_URL": JSON.stringify(process.env.SAVORA_ACCOUNT_API_BASE_URL ?? ""),
      "process.env.SAVORA_ACCOUNT_WEB_ORIGIN": JSON.stringify(process.env.SAVORA_ACCOUNT_WEB_ORIGIN ?? ""),
      "process.env.SAVORA_ACCOUNT_MAIL_DELIVERY_READY": JSON.stringify(process.env.SAVORA_ACCOUNT_MAIL_DELIVERY_READY ?? "false"),
    },
    server: { watch: {
      ignored: ["**/.run/**", "**/server/backups/**", "**/server/node/dist/**"],
      ...(isCodexSeatbeltSandbox ? { useFsEvents: false, usePolling: true } : {}),
    } },
    plugins: [
      vinext(),
      sites(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        config: localBindingConfig,
      }),
    ],
  };
});
