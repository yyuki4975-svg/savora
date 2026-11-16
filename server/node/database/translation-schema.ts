import { sql } from "drizzle-orm";
import { pgTable, text, varchar, uuid, integer, numeric, jsonb, timestamp, primaryKey, check, index } from "drizzle-orm/pg-core";
import { recipeVersions } from "./schema";

// Public recipe text only. No accounts, private kitchen notes, drafts or provider secrets.
export const translationRuns = pgTable("translation_runs", {
  id: uuid().primaryKey(), sourceSha256: varchar("source_sha256", { length: 64 }).notNull(),
  state: varchar({ length: 24 }).notNull().default("Prepared"), manifest: jsonb().notNull(),
  budgetUsd: numeric("budget_usd", { precision: 12, scale: 8 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [check("translation_run_state", sql`${t.state} IN ('Prepared','Running','Stopped','ReviewReady','Accepted')`),
  check("translation_run_hash", sql`${t.sourceSha256} ~ '^[0-9a-f]{64}$'`),
  check("translation_run_budget", sql`${t.budgetUsd}>0 AND ${t.budgetUsd}<=19`)]);

export const translationUnits = pgTable("translation_units", {
  sourceSha256: varchar("source_sha256", { length: 64 }).notNull(), locale: varchar({ length: 16 }).notNull(),
  kind: varchar({ length: 24 }).notNull(), sourceText: text("source_text").notNull(),
  translatedText: text("translated_text"), state: varchar({ length: 24 }).notNull().default("Pending"),
  model: varchar({ length: 80 }).notNull(), promptVersion: varchar("prompt_version", { length: 32 }).notNull(),
  attempts: integer().notNull().default(0), review: jsonb(),
  reportedCostUsd: numeric("reported_cost_usd", { precision: 12, scale: 8 }).notNull().default("0"),
  totalTokens: integer("total_tokens").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [primaryKey({ columns: [t.sourceSha256, t.locale] }),
  check("translation_unit_hash", sql`${t.sourceSha256} ~ '^[0-9a-f]{64}$'`),
  check("translation_unit_locale", sql`${t.locale} IN ('zh','ja','fr','it','es')`),
  check("translation_unit_state", sql`${t.state} IN ('Pending','Generated','Reviewed','NeedsChanges','Failed')`),
  check("translation_unit_model", sql`(${t.locale}='zh' AND ${t.model} IN ('qwen/qwen3.8-flash','qwen/qwen3.7-flash')) OR (${t.locale}<>'zh' AND ${t.model}='google/gemini-3.8-flash')`),
  check("translation_unit_bounds", sql`length(${t.sourceText}) BETWEEN 1 AND 3000 AND (${t.translatedText} IS NULL OR length(${t.translatedText}) BETWEEN 1 AND 12000) AND ${t.attempts}>=0 AND ${t.reportedCostUsd}>=0 AND ${t.totalTokens}>=0`),
  index("translation_unit_work").on(t.locale, t.state, t.sourceSha256)]);

export const recipeLocalizations = pgTable("recipe_localizations", {
  recipeVersionId: uuid("recipe_version_id").notNull().references(() => recipeVersions.id, { onDelete: "cascade" }),
  locale: varchar({ length: 16 }).notNull(), runId: uuid("run_id").notNull().references(() => translationRuns.id),
  sourceSha256: varchar("source_sha256", { length: 64 }).notNull(), payload: jsonb().notNull(),
  state: varchar({ length: 16 }).notNull().default("Staged"), reviewedBy: varchar("reviewed_by", { length: 80 }),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
}, t => [primaryKey({ columns: [t.recipeVersionId, t.locale] }),
  check("recipe_localization_locale", sql`${t.locale} IN ('zh','ja','fr','it','es')`),
  check("recipe_localization_hash", sql`${t.sourceSha256} ~ '^[0-9a-f]{64}$'`),
  check("recipe_localization_state", sql`${t.state} IN ('Staged','Accepted')`),
  check("recipe_localization_review", sql`(${t.state}='Accepted') = (${t.reviewedBy} IS NOT NULL AND ${t.reviewedAt} IS NOT NULL)`),
  check("recipe_localization_payload", sql`jsonb_typeof(${t.payload})='object' AND octet_length(${t.payload}::text)<=200000`)]);
