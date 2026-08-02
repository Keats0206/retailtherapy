CREATE TABLE "saved_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"product_id" uuid NOT NULL,
	"source_stream_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_shows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stream_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_items" ADD CONSTRAINT "saved_items_source_stream_id_streams_id_fk" FOREIGN KEY ("source_stream_id") REFERENCES "public"."streams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_shows" ADD CONSTRAINT "saved_shows_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_items_user_product_idx" ON "saved_items" USING btree ("user_id","product_id");--> statement-breakpoint
CREATE INDEX "saved_items_user_idx" ON "saved_items" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_shows_user_stream_idx" ON "saved_shows" USING btree ("user_id","stream_id");--> statement-breakpoint
CREATE INDEX "saved_shows_user_idx" ON "saved_shows" USING btree ("user_id","created_at");