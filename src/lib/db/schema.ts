import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Relative, not the `@/` alias: drizzle-kit loads this file outside Next and
// does not resolve tsconfig paths.
import type { StreamSnapshot } from "../stream-store";

/**
 * Schema for the retail livestream shopping MVP.
 *
 * `products` mirror items sourced from Channel3, `streams` are livestream
 * sessions, and `stream_products` is the join that records which products were
 * featured during a stream, in the order the host pinned them.
 *
 * A stream's video takes two paths at once: LiveKit carries the low-latency
 * WebRTC feed to live viewers, while a LiveKit Egress mirrors the same room to
 * Mux over RTMP so Mux can archive it as an on-demand asset. That asset is the
 * replay served at /s/<slug> once the show ends.
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
    // Price stored in minor units (cents) to avoid float rounding. The
    // app-facing `Product` in lib/types.ts uses major units — convert at the
    // boundary (see `toProductRow` / `toProduct` in lib/shows.ts).
    priceCents: integer("price_cents").notNull().default(0),
    currency: text("currency").notNull().default("usd"),
    // Retailer host ("uniqlo.com") and the Channel3 trackable link. Without
    // these a persisted product can be shown but not bought, which is the whole
    // point of the replay.
    retailer: text("retailer"),
    buyUrl: text("buy_url"),
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

export const streams = pgTable(
  "streams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Short, URL-safe public handle. This — not the uuid — is what appears in
    // the shareable link (/s/<slug>), so it stays short enough to say out loud.
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    // Clerk user id of the host. Scopes "my shows" without a users table.
    hostUserId: text("host_user_id").notNull(),
    hostName: text("host_name"),
    status: streamStatus("status").notNull().default("scheduled"),
    // LiveKit room carrying the live WebRTC feed, chat and votes. Unique per
    // show (not per host) so each show gets its own room and its own recording.
    roomName: text("room_name").notNull(),
    // LiveKit Egress mirroring the room to Mux over RTMP. Null before the host
    // connects, and after the egress is stopped.
    egressId: text("egress_id"),
    // The Mux live stream the egress pushes into. `muxStreamKey` is a secret:
    // it is only ever read server-side when starting the egress.
    muxLiveStreamId: text("mux_live_stream_id"),
    muxStreamKey: text("mux_stream_key"),
    // The on-demand asset Mux creates from the broadcast, and its playback id.
    // Both are null until Mux finishes packaging, which is why /s/<slug> has a
    // "still processing" state (see `resolveRecording` in lib/shows.ts).
    muxAssetId: text("mux_asset_id"),
    muxPlaybackId: text("mux_playback_id"),
    // Final shopping state: trail, pinned item and vote tallies. Written
    // periodically during the show and definitively on end, so the recap
    // survives a host who closes the tab instead of pressing End show.
    snapshot: jsonb("snapshot").$type<StreamSnapshot>(),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("streams_slug_idx").on(table.slug),
    uniqueIndex("streams_room_name_idx").on(table.roomName),
    index("streams_host_user_idx").on(table.hostUserId),
  ],
);

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
    // The host's aside about this item ("runs small, size up").
    note: text("note"),
    // Final tallies for this product in this stream, frozen when the show ends.
    buyVotes: integer("buy_votes").notNull().default(0),
    skipVotes: integer("skip_votes").notNull().default(0),
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
