CREATE TABLE "savora_product"."auth_limits" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer NOT NULL,
	CONSTRAINT "limits_positive" CHECK ("savora_product"."auth_limits"."count" BETWEEN 1 AND 10000)
);
--> statement-breakpoint
CREATE INDEX "limits_expiry" ON "savora_product"."auth_limits" USING btree ("window_start");