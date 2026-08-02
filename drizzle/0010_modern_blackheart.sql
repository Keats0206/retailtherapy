CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"city" text,
	"bio" text,
	"socials" jsonb,
	"saved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "mux_duration_seconds" integer;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "recording_captured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "transcript" text;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "search_text" text;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");