import { defineConfig } from "drizzle-kit";

// Reviewed SQL migrations only. Never use `push` against the catalog.
// https://orm.drizzle.team/docs/drizzle-kit-pull
export default defineConfig({
  dialect: "postgresql",
  schema: "./database/schema.ts",
  out: "./migrations",
  schemaFilter: ["public", "savora_product"],
  dbCredentials: { url: process.env.SAVORA_DATABASE_URL ?? "" },
  strict: true,
});
