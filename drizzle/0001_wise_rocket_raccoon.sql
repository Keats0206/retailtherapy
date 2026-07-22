ALTER TABLE "products" ADD COLUMN "retailer" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "buy_url" text;--> statement-breakpoint
ALTER TABLE "stream_products" ADD COLUMN "note" text;--> statement-breakpoint
ALTER TABLE "stream_products" ADD COLUMN "buy_votes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "stream_products" ADD COLUMN "skip_votes" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "host_user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "room_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "egress_id" text;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "mux_live_stream_id" text;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "mux_stream_key" text;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "mux_asset_id" text;--> statement-breakpoint
ALTER TABLE "streams" ADD COLUMN "snapshot" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "streams_slug_idx" ON "streams" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "streams_room_name_idx" ON "streams" USING btree ("room_name");--> statement-breakpoint
CREATE INDEX "streams_host_user_idx" ON "streams" USING btree ("host_user_id");