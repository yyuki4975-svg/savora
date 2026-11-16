CREATE TABLE "recipe_localizations" (
	"recipe_version_id" uuid NOT NULL,
	"locale" varchar(16) NOT NULL,
	"run_id" uuid NOT NULL,
	"source_sha256" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"state" varchar(16) DEFAULT 'Staged' NOT NULL,
	"reviewed_by" varchar(80),
	"reviewed_at" timestamp with time zone,
	CONSTRAINT "recipe_localizations_recipe_version_id_locale_pk" PRIMARY KEY("recipe_version_id","locale"),
	CONSTRAINT "recipe_localization_locale" CHECK ("recipe_localizations"."locale" IN ('zh','ja','fr','it','es')),
	CONSTRAINT "recipe_localization_hash" CHECK ("recipe_localizations"."source_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "recipe_localization_state" CHECK ("recipe_localizations"."state" IN ('Staged','Accepted')),
	CONSTRAINT "recipe_localization_review" CHECK (("recipe_localizations"."state"='Accepted') = ("recipe_localizations"."reviewed_by" IS NOT NULL AND "recipe_localizations"."reviewed_at" IS NOT NULL)),
	CONSTRAINT "recipe_localization_payload" CHECK (jsonb_typeof("recipe_localizations"."payload")='object' AND octet_length("recipe_localizations"."payload"::text)<=200000)
);
--> statement-breakpoint
CREATE TABLE "translation_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_sha256" varchar(64) NOT NULL,
	"state" varchar(24) DEFAULT 'Prepared' NOT NULL,
	"manifest" jsonb NOT NULL,
	"budget_usd" numeric(12, 8) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_run_state" CHECK ("translation_runs"."state" IN ('Prepared','Running','Stopped','ReviewReady','Accepted')),
	CONSTRAINT "translation_run_hash" CHECK ("translation_runs"."source_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "translation_run_budget" CHECK ("translation_runs"."budget_usd">0 AND "translation_runs"."budget_usd"<=10)
);
--> statement-breakpoint
CREATE TABLE "translation_units" (
	"source_sha256" varchar(64) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"kind" varchar(24) NOT NULL,
	"source_text" text NOT NULL,
	"translated_text" text,
	"state" varchar(24) DEFAULT 'Pending' NOT NULL,
	"model" varchar(80) NOT NULL,
	"prompt_version" varchar(32) NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"review" jsonb,
	"reported_cost_usd" numeric(12, 8) DEFAULT '0' NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "translation_units_source_sha256_locale_pk" PRIMARY KEY("source_sha256","locale"),
	CONSTRAINT "translation_unit_hash" CHECK ("translation_units"."source_sha256" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "translation_unit_locale" CHECK ("translation_units"."locale" IN ('zh','ja','fr','it','es')),
	CONSTRAINT "translation_unit_state" CHECK ("translation_units"."state" IN ('Pending','Generated','Reviewed','NeedsChanges','Failed')),
	CONSTRAINT "translation_unit_model" CHECK (("translation_units"."locale"='zh' AND "translation_units"."model"='qwen/qwen3.8-flash') OR ("translation_units"."locale"<>'zh' AND "translation_units"."model"='google/gemini-3.8-flash')),
	CONSTRAINT "translation_unit_bounds" CHECK (length("translation_units"."source_text") BETWEEN 1 AND 3000 AND ("translation_units"."translated_text" IS NULL OR length("translation_units"."translated_text") BETWEEN 1 AND 12000) AND "translation_units"."attempts">=0 AND "translation_units"."reported_cost_usd">=0 AND "translation_units"."total_tokens">=0)
);
--> statement-breakpoint
ALTER TABLE "recipe_localizations" ADD CONSTRAINT "recipe_localizations_recipe_version_id_recipe_versions_id_fk" FOREIGN KEY ("recipe_version_id") REFERENCES "public"."recipe_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_localizations" ADD CONSTRAINT "recipe_localizations_run_id_translation_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."translation_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "translation_unit_work" ON "translation_units" USING btree ("locale","state","source_sha256");