CREATE TABLE "savora_product"."kitchen_states" (
	"account_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"status" varchar(16),
	"private_note" varchar(4000),
	"servings" integer DEFAULT 1 NOT NULL,
	"revision" integer NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kitchen_states_account_id_recipe_id_pk" PRIMARY KEY("account_id","recipe_id"),
	CONSTRAINT "kitchen_status" CHECK ("savora_product"."kitchen_states"."status" IS NULL OR "savora_product"."kitchen_states"."status" IN ('Want to cook','Cooking','Cooked','Favorite')),
	CONSTRAINT "kitchen_content" CHECK ("savora_product"."kitchen_states"."status" IS NOT NULL OR "savora_product"."kitchen_states"."private_note" IS NOT NULL),
	CONSTRAINT "kitchen_bounds" CHECK ("savora_product"."kitchen_states"."servings" BETWEEN 1 AND 100 AND "savora_product"."kitchen_states"."revision" > 0)
);
--> statement-breakpoint
CREATE TABLE "savora_product"."write_receipts" (
	"account_id" uuid NOT NULL,
	"scope" varchar(160) NOT NULL,
	"key" varchar(128) NOT NULL,
	"payload_hash" varchar(64) NOT NULL,
	"response" jsonb NOT NULL,
	"expires_at" timestamp with time zone DEFAULT now()+interval '30 days' NOT NULL,
	CONSTRAINT "write_receipts_account_id_scope_key_pk" PRIMARY KEY("account_id","scope","key")
);
--> statement-breakpoint
ALTER TABLE "savora_product"."kitchen_states" ADD CONSTRAINT "kitchen_states_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "savora_product"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."kitchen_states" ADD CONSTRAINT "kitchen_states_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."write_receipts" ADD CONSTRAINT "write_receipts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "savora_product"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receipt_expiry" ON "savora_product"."write_receipts" USING btree ("expires_at");