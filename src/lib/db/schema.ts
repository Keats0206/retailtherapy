import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Schema for the retail livestream shopping MVP.
 *
 * `products` mirror items sourced from Channel3, `streams` are livestream
 * sessions (video handled by Mux), and `stream_products` is the join that
 * decides which products are featured — and spotlighted — during a stream.
 */

export const streamStatus = pgEnum("stream_status", [
  "scheduled",
  "live",
  "ended",
]);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Stable id from the upstream catalog (Channel3) so we can upsert.
    externalId: text("external_id"),
    title: text("title").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    // Price stored in minor units (cents) to avoid float rounding.
    priceCents: integer("price_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("products_external_id_idx").on(table.externalId),
  ],
);

export const streams = pgTable("streams", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  hostName: text("host_name"),
  status: streamStatus("status").notNull().default("scheduled"),
  // Mux playback id used by the player on the client.
  muxPlaybackId: text("mux_playback_id"),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const streamProducts = pgTable(
  "stream_products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    streamId: uuid("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // Order the product appears in the stream's product rail.
    position: integer("position").notNull().default(0),
    // Whether the host is currently spotlighting this product on-screen.
    isSpotlighted: boolean("is_spotlighted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("stream_products_unique_idx").on(
      table.streamId,
      table.productId,
    ),
    index("stream_products_stream_idx").on(table.streamId),
  ],
);

export const streamsRelations = relations(streams, ({ many }) => ({
  streamProducts: many(streamProducts),
}));

export const productsRelations = relations(products, ({ many }) => ({
  streamProducts: many(streamProducts),
}));

export const streamProductsRelations = relations(streamProducts, ({ one }) => ({
  stream: one(streams, {
    fields: [streamProducts.streamId],
    references: [streams.id],
  }),
  product: one(products, {
    fields: [streamProducts.productId],
    references: [products.id],
  }),
}));

// Convenience row types for use across the app.
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Stream = typeof streams.$inferSelect;
export type NewStream = typeof streams.$inferInsert;
export type StreamProduct = typeof streamProducts.$inferSelect;
export type NewStreamProduct = typeof streamProducts.$inferInsert;
