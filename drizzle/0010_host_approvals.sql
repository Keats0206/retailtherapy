CREATE TYPE "public"."waitlist_status" AS ENUM('pending', 'approved', 'declined');--> statement-breakpoint
CREATE TYPE "public"."host_approval_source" AS ENUM('waitlist', 'migration', 'manual');--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "status" "waitlist_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "waitlist_signups" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
CREATE INDEX "waitlist_signups_status_idx" ON "waitlist_signups" USING btree ("status");--> statement-breakpoint
CREATE TABLE "host_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"email" text NOT NULL,
	"source" "host_approval_source" NOT NULL,
	"waitlist_signup_id" uuid,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" text
);
--> statement-breakpoint
ALTER TABLE "host_approvals" ADD CONSTRAINT "host_approvals_waitlist_signup_id_waitlist_signups_id_fk" FOREIGN KEY ("waitlist_signup_id") REFERENCES "public"."waitlist_signups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "host_approvals_user_id_idx" ON "host_approvals" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "host_approvals_email_idx" ON "host_approvals" USING btree ("email");--> statement-breakpoint
INSERT INTO "host_approvals" ("user_id", "email", "source")
SELECT DISTINCT s.host_user_id, s.host_user_id || '@migration.internal', 'migration'::host_approval_source
FROM "streams" s
WHERE s.host_user_id IS NOT NULL
ON CONFLICT ("user_id") DO NOTHING;
