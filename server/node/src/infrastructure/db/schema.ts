// Runtime mapping of catalog tables. Full migration definitions, including indexes and
// constraints, live in server/node/database/schema.ts and server/node/migrations/.
// Only the columns the API reads and the offline tools write are declared. Nothing here is used to
// create or migrate tables; the drift test checks every declaration against the real database.
import {
  boolean,
  doublePrecision,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "string" });

export const recipes = pgTable("recipes", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  status: text("status").notNull(),
  currentVersionId: uuid("current_version_id"),
  createdAt: timestamptz("created_at").notNull(),
  updatedAt: timestamptz("updated_at").notNull(),
  publishedAt: timestamptz("published_at"),
});

export const recipeVersions = pgTable("recipe_versions", {
  id: uuid("id").primaryKey(),
  recipeId: uuid("recipe_id").notNull(),
  versionNumber: integer("version_number").notNull(),
  originalLocale: text("original_locale").notNull(),
  servings: integer("servings").notNull(),
  preparationMinutes: integer("preparation_minutes"),
  cookingMinutes: integer("cooking_minutes"),
  createdAt: timestamptz("created_at").notNull(),
});

export const recipeTranslations = pgTable("recipe_translations", {
  id: uuid("id").primaryKey(),
  recipeVersionId: uuid("recipe_version_id").notNull(),
  locale: text("locale").notNull(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  culturalNote: text("cultural_note"),
  isMachineTranslated: boolean("is_machine_translated").notNull(),
});

export const recipeIngredientLines = pgTable("recipe_ingredient_lines", {
  id: uuid("id").primaryKey(),
  recipeVersionId: uuid("recipe_version_id").notNull(),
  position: integer("position").notNull(),
  name: text("name").notNull(),
  quantity: numeric("quantity", { precision: 12, scale: 4 }),
  unit: text("unit"),
  preparationNote: text("preparation_note"),
});

export const recipeSteps = pgTable("recipe_steps", {
  id: uuid("id").primaryKey(),
  recipeVersionId: uuid("recipe_version_id").notNull(),
  position: integer("position").notNull(),
  title: text("title"),
  instruction: text("instruction").notNull(),
  durationMinutes: integer("duration_minutes"),
});

export const sourceAttributions = pgTable("source_attributions", {
  id: uuid("id").primaryKey(),
  recipeVersionId: uuid("recipe_version_id").notNull(),
  sourceUrl: text("source_url").notNull(),
  sourceName: text("source_name").notNull(),
  licenseCode: text("license_code").notNull(),
  retrievedAt: timestamptz("retrieved_at").notNull(),
  externalId: text("external_id"),
});

export const places = pgTable("places", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  type: text("type").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  wikidataId: text("wikidata_id"),
});

export const placeNames = pgTable("place_names", {
  id: uuid("id").primaryKey(),
  placeId: uuid("place_id").notNull(),
  locale: text("locale").notNull(),
  name: text("name").notNull(),
});

export const recipePlaceAssociations = pgTable("recipe_place_associations", {
  recipeId: uuid("recipe_id").notNull(),
  placeId: uuid("place_id").notNull(),
  relationType: text("relation_type").notNull(),
  isPrimary: boolean("is_primary").notNull(),
});

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey(),
  storageKey: text("storage_key"),
  sourceUrl: text("source_url"),
  contentType: text("content_type").notNull(),
  altText: text("alt_text").notNull(),
  creator: text("creator").notNull(),
  licenseCode: text("license_code").notNull(),
  licenseUrl: text("license_url").notNull(),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  width: integer("width"),
  height: integer("height"),
  rightsStatus: text("rights_status").notNull(),
  createdAt: timestamptz("created_at").notNull(),
});

export const recipeMediaAssociations = pgTable("recipe_media_associations", {
  recipeId: uuid("recipe_id").notNull(),
  mediaAssetId: uuid("media_asset_id").notNull(),
  position: integer("position").notNull(),
  isPrimary: boolean("is_primary").notNull(),
});

export const recipePublicationAudits = pgTable("recipe_publication_audits", {
  id: uuid("id").primaryKey(),
  recipeId: uuid("recipe_id").notNull(),
  recipeVersionId: uuid("recipe_version_id").notNull(),
  basedOnVersion: integer("based_on_version").notNull(),
  fromStatus: text("from_status").notNull(),
  toStatus: text("to_status").notNull(),
  payloadSha256: text("payload_sha256").notNull(),
  reviewedBy: text("reviewed_by").notNull(),
  reviewNote: text("review_note").notNull(),
  mediaPolicy: text("media_policy").notNull(),
  approvedAt: timestamptz("approved_at").notNull(),
  recordedAt: timestamptz("recorded_at").notNull(),
});

export const mediaReviewImports = pgTable("media_review_imports", {
  id: uuid("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  scope: text("scope").notNull(),
  payloadSha256: text("payload_sha256").notNull(),
  manifestSha256: text("manifest_sha256").notNull(),
  exportedAt: timestamptz("exported_at").notNull(),
  importedAt: timestamptz("imported_at").notNull(),
});

export const mediaReviewDecisions = pgTable("media_review_decisions", {
  reviewImportId: uuid("review_import_id").notNull(),
  recipeId: uuid("recipe_id").notNull(),
  candidateProviderId: text("candidate_provider_id"),
  decision: text("decision").notNull(),
  recipeChecked: boolean("recipe_checked").notNull(),
  visualChecked: boolean("visual_checked").notNull(),
  rightsChecked: boolean("rights_checked").notNull(),
  qualityChecked: boolean("quality_checked").notNull(),
  note: text("note"),
});

/** Every table/column declared above, for the schema-drift check against information_schema. */
export const declaredTables = {
  recipes,
  recipeVersions,
  recipeTranslations,
  recipeIngredientLines,
  recipeSteps,
  sourceAttributions,
  places,
  placeNames,
  recipePlaceAssociations,
  mediaAssets,
  recipeMediaAssociations,
  recipePublicationAudits,
  mediaReviewImports,
  mediaReviewDecisions,
};
