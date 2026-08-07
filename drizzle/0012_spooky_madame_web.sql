CREATE TYPE "public"."show_reminder_status" AS ENUM('pending', 'sent', 'skipped');--> statement-breakpoint
CREATE TABLE "show_interests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_id" uuid NOT NULL,
	"user_id" text,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "show_reminder_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_id" uuid NOT NULL,
	"send_at" timestamp with time zone NOT NULL,
	"status" "show_reminder_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sent_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "show_interests" ADD CONSTRAINT "show_interests_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_reminder_jobs" ADD CONSTRAINT "show_reminder_jobs_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "show_interests_stream_user_idx" ON "show_interests" USING btree ("stream_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "show_interests_stream_email_idx" ON "show_interests" USING btree ("stream_id","email");--> statement-breakpoint
CREATE INDEX "show_interests_stream_idx" ON "show_interests" USING btree ("stream_id");--> statement-breakpoint
CREATE INDEX "show_reminder_jobs_pending_idx" ON "show_reminder_jobs" USING btree ("status","send_at");--> statement-breakpoint
CREATE INDEX "show_reminder_jobs_stream_idx" ON "show_reminder_jobs" USING btree ("stream_id");