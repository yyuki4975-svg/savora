CREATE TABLE "savora_product"."community_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" varchar(24) NOT NULL,
	"reason" varchar(1000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_event_action" CHECK ("savora_product"."community_events"."action" IN ('owner-remove','hide','dismiss'))
);
--> statement-breakpoint
CREATE TABLE "savora_product"."community_marks" (
	"post_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"kind" varchar(16) NOT NULL,
	CONSTRAINT "community_marks_post_id_account_id_kind_pk" PRIMARY KEY("post_id","account_id","kind"),
	CONSTRAINT "community_mark_kind" CHECK ("savora_product"."community_marks"."kind" IN ('Helpful','Saved'))
);
--> statement-breakpoint
CREATE TABLE "savora_product"."community_posts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"author_id" uuid NOT NULL,
	"space" varchar(40) NOT NULL,
	"body" varchar(4000) NOT NULL,
	"recipe_id" uuid,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_space" CHECK ("savora_product"."community_posts"."space" IN ('The shared table','Technique exchange','Family recipe circle','Cookbook club')),
	CONSTRAINT "community_body" CHECK (length(btrim("savora_product"."community_posts"."body"))>0)
);
--> statement-breakpoint
CREATE TABLE "savora_product"."community_replies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" varchar(2000) NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_reply_body" CHECK (length(btrim("savora_product"."community_replies"."body"))>0)
);
--> statement-breakpoint
CREATE TABLE "savora_product"."community_reports" (
	"id" uuid PRIMARY KEY NOT NULL,
	"post_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" varchar(1000) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "savora_product"."kitchen_documents" (
	"account_id" uuid PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"revision" bigint NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "kitchen_document_size" CHECK (jsonb_typeof("savora_product"."kitchen_documents"."content")='object' AND octet_length("savora_product"."kitchen_documents"."content"::text)<=100000),
	CONSTRAINT "kitchen_document_revision" CHECK ("savora_product"."kitchen_documents"."revision">0 AND "savora_product"."kitchen_documents"."revision"<=9007199254740990)
);
--> statement-breakpoint
CREATE TABLE "savora_product"."submission_publications" (
	"submission_id" uuid PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"recipe_id" uuid NOT NULL,
	"published_by" uuid NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"withdrawn_at" timestamp with time zone,
	CONSTRAINT "submission_publications_recipe_id_unique" UNIQUE("recipe_id"),
	CONSTRAINT "publication_version" CHECK ("savora_product"."submission_publications"."version">0)
);
--> statement-breakpoint
ALTER TABLE "savora_product"."community_events" ADD CONSTRAINT "community_events_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "savora_product"."community_posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."community_events" ADD CONSTRAINT "community_events_actor_id_accounts_id_fk" FOREIGN KEY ("actor_id") REFERENCES "savora_product"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."community_marks" ADD CONSTRAINT "community_marks_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "savora_product"."community_posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."community_marks" ADD CONSTRAINT "community_marks_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "savora_product"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."community_posts" ADD CONSTRAINT "community_posts_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "savora_product"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."community_posts" ADD CONSTRAINT "community_posts_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."community_replies" ADD CONSTRAINT "community_replies_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "savora_product"."community_posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."community_replies" ADD CONSTRAINT "community_replies_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "savora_product"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."community_reports" ADD CONSTRAINT "community_reports_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "savora_product"."community_posts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."community_reports" ADD CONSTRAINT "community_reports_reporter_id_accounts_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "savora_product"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."kitchen_documents" ADD CONSTRAINT "kitchen_documents_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "savora_product"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."submission_publications" ADD CONSTRAINT "submission_publications_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "savora_product"."submissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."submission_publications" ADD CONSTRAINT "submission_publications_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."submission_publications" ADD CONSTRAINT "submission_publications_published_by_accounts_id_fk" FOREIGN KEY ("published_by") REFERENCES "savora_product"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "community_audit" ON "savora_product"."community_events" USING btree ("post_id","id");--> statement-breakpoint
CREATE INDEX "community_saved" ON "savora_product"."community_marks" USING btree ("account_id","kind","post_id");--> statement-breakpoint
CREATE INDEX "community_feed" ON "savora_product"."community_posts" USING btree ("space","id");--> statement-breakpoint
CREATE INDEX "community_author" ON "savora_product"."community_posts" USING btree ("author_id","id");--> statement-breakpoint
CREATE INDEX "community_reply_post" ON "savora_product"."community_replies" USING btree ("post_id","id");--> statement-breakpoint
CREATE INDEX "community_report_queue" ON "savora_product"."community_reports" USING btree ("resolved_at","id");--> statement-breakpoint
CREATE UNIQUE INDEX "community_report_actor" ON "savora_product"."community_reports" USING btree ("post_id","reporter_id");