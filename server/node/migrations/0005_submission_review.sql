CREATE TABLE "savora_product"."submission_events" (
	"submission_id" uuid NOT NULL,
	"revision" integer NOT NULL,
	"actor_id" uuid NOT NULL,
	"from_state" varchar(16),
	"to_state" varchar(16) NOT NULL,
	"reason" varchar(2000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_events_submission_id_revision_pk" PRIMARY KEY("submission_id","revision")
);
--> statement-breakpoint
CREATE TABLE "savora_product"."submission_versions" (
	"submission_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_versions_submission_id_version_pk" PRIMARY KEY("submission_id","version"),
	CONSTRAINT "submission_version_positive" CHECK ("savora_product"."submission_versions"."version">0)
);
--> statement-breakpoint
CREATE TABLE "savora_product"."submissions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"owner_id" uuid NOT NULL,
	"state" varchar(16) DEFAULT 'Draft' NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"content" jsonb NOT NULL,
	"reviewer_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "submission_state" CHECK ("savora_product"."submissions"."state" IN ('Draft','Submitted','InReview','NeedsChanges','Approved','Rejected')),
	CONSTRAINT "submission_versions" CHECK ("savora_product"."submissions"."revision">0 AND "savora_product"."submissions"."version">=0),
	CONSTRAINT "submission_content" CHECK (jsonb_typeof("savora_product"."submissions"."content")='object' AND octet_length("savora_product"."submissions"."content"::text)<=100000),
	CONSTRAINT "submission_reviewer" CHECK (("savora_product"."submissions"."state" IN ('InReview','Approved','Rejected')) = ("savora_product"."submissions"."reviewer_id" IS NOT NULL)),
	CONSTRAINT "submission_no_self_review" CHECK ("savora_product"."submissions"."reviewer_id" IS NULL OR "savora_product"."submissions"."reviewer_id"<>"savora_product"."submissions"."owner_id")
);
--> statement-breakpoint
ALTER TABLE "savora_product"."submission_events" ADD CONSTRAINT "submission_events_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "savora_product"."submissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."submission_events" ADD CONSTRAINT "submission_events_actor_id_accounts_id_fk" FOREIGN KEY ("actor_id") REFERENCES "savora_product"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."submission_versions" ADD CONSTRAINT "submission_versions_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "savora_product"."submissions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."submissions" ADD CONSTRAINT "submissions_owner_id_accounts_id_fk" FOREIGN KEY ("owner_id") REFERENCES "savora_product"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."submissions" ADD CONSTRAINT "submissions_reviewer_id_accounts_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "savora_product"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "submissions_owner" ON "savora_product"."submissions" USING btree ("owner_id","id");--> statement-breakpoint
CREATE INDEX "submissions_queue" ON "savora_product"."submissions" USING btree ("state","id");