CREATE TYPE "public"."outreach_status" AS ENUM('new', 'drafted', 'contacted', 'replied', 'onboarded', 'passed');--> statement-breakpoint
CREATE TABLE "creator_prospects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text DEFAULT 'tiktok' NOT NULL,
	"platform_user_id" text,
	"handle" text NOT NULL,
	"display_name" text,
	"avatar_url" text,
	"bio" text,
	"bio_link" text,
	"follower_count" integer DEFAULT 0 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"email" text,
	"discovered_via" text,
	"status" "outreach_status" DEFAULT 'new' NOT NULL,
	"draft_subject" text,
	"draft_body" text,
	"notes" text,
	"contacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "creator_prospects_platform_handle_idx" ON "creator_prospects" USING btree ("platform","handle");--> statement-breakpoint
CREATE INDEX "creator_prospects_status_idx" ON "creator_prospects" USING btree ("status");