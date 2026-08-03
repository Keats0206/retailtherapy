CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "mux_duration_seconds" integer;
--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "recording_captured" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "transcript" text;
--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "search_text" text;
--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "embedding" vector(1536);
--> statement-breakpoint
UPDATE "streams" SET "recording_captured" = true WHERE "status" = 'ended' AND "mux_live_stream_id" IS NOT NULL;
--> statement-breakpoint
CREATE INDEX "streams_embedding_idx" ON "streams" USING hnsw ("embedding" vector_cosine_ops);
