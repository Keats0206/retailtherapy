CREATE TABLE "challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"prompt" text NOT NULL,
	"brand_name" text NOT NULL,
	"brand_domain" text,
	"brand_logo_url" text,
	"store_url" text,
	"emoji" text,
	"budget_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"duration_seconds" integer,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "challenge_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "challenges_slug_idx" ON "challenges" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "challenges_schedule_idx" ON "challenges" USING btree ("is_active","starts_at");--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "streams_challenge_idx" ON "streams" USING btree ("challenge_id","status");