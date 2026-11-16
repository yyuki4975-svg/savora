CREATE SCHEMA "savora_product";
--> statement-breakpoint
CREATE TABLE "savora_product"."accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(254) NOT NULL,
	"display_name" varchar(80) NOT NULL,
	"password_hash" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"credential_version" integer DEFAULT 1 NOT NULL,
	"role" varchar(16) DEFAULT 'User' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_unique" UNIQUE("email"),
	CONSTRAINT "account_role" CHECK ("savora_product"."accounts"."role" IN ('User','Contributor','Editor','Moderator','Admin')),
	CONSTRAINT "account_version" CHECK ("savora_product"."accounts"."credential_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "savora_product"."action_tokens" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"purpose" varchar(16) NOT NULL,
	"credential_version" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	CONSTRAINT "token_purpose" CHECK ("savora_product"."action_tokens"."purpose" IN ('VerifyEmail','ResetPassword'))
);
--> statement-breakpoint
CREATE TABLE "savora_product"."mail_outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"dedupe_key" varchar(128) NOT NULL,
	"payload" text,
	"status" varchar(16) DEFAULT 'Pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"lease_token" uuid,
	"lease_until" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"last_error" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "mail_outbox_dedupe_key_unique" UNIQUE("dedupe_key"),
	CONSTRAINT "outbox_status" CHECK ("savora_product"."mail_outbox"."status" IN ('Pending','Sending','Sent','Dead','Expired')),
	CONSTRAINT "outbox_attempts" CHECK ("savora_product"."mail_outbox"."attempts" BETWEEN 0 AND 8),
	CONSTRAINT "outbox_lease" CHECK (("savora_product"."mail_outbox"."status" = 'Sending') = ("savora_product"."mail_outbox"."lease_token" IS NOT NULL AND "savora_product"."mail_outbox"."lease_until" IS NOT NULL)),
	CONSTRAINT "outbox_payload" CHECK (("savora_product"."mail_outbox"."status" IN ('Pending','Sending')) = ("savora_product"."mail_outbox"."payload" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "savora_product"."sessions" (
	"token_hash" varchar(64) PRIMARY KEY NOT NULL,
	"account_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "savora_product"."action_tokens" ADD CONSTRAINT "action_tokens_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "savora_product"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "savora_product"."sessions" ADD CONSTRAINT "sessions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "savora_product"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tokens_account" ON "savora_product"."action_tokens" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "outbox_due" ON "savora_product"."mail_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "sessions_account" ON "savora_product"."sessions" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "sessions_expiry" ON "savora_product"."sessions" USING btree ("expires_at");