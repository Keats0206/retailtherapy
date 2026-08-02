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
import type { ProfileSocials } from "../social-links";
import type { ShowSetup } from "../show-setup";
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
    // Onboarding answers: shopping intent, item focus, and social handles.
    // Null for shows created before setup existed, or if the host skipped.
    setup: jsonb("setup").$type<ShowSetup>(),
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

/**
 * Who a signed-in user is on frontrow: display name, city, and where they
 * publish elsewhere. One row per Clerk user, created the first time they save
 * the profile form on /home — its absence is what routes a fresh signup into
 * profile setup. `socials` values are either a bare handle ("leon") or a full
 * URL for accounts the handle grammar can't express; `socialProfileUrl` in
 * lib/social-links.ts turns either form back into a link.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Clerk user id — the only identity we have; there is no local users table.
    userId: text("user_id").notNull(),
    name: text("name"),
    city: text("city"),
    // Free-text "a little about you" — capped in lib/profile.ts, not here.
    bio: text("bio"),
    socials: jsonb("socials").$type<ProfileSocials>(),
    // When the user last pressed Save — doubles as "setup completed".
    savedAt: timestamp("saved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("profiles_user_id_idx").on(table.userId)],
);

/**
 * Hosting is invite-only, so /apply collects interest instead of granting
 * access. One row per email — a repeat signup refreshes the details rather
 * than stacking duplicates.
 */
export const waitlistSignups = pgTable(
  "waitlist_signups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Stored lowercased and trimmed so the unique index actually dedupes.
    email: text("email").notNull(),
    name: text("name"),
    // Where they already publish ("@you", "youtube.com/c/you").
    handle: text("handle"),
    // What they'd shop live, in their words.
    pitch: text("pitch"),
    socials: jsonb("socials").$type<{
      instagram?: string;
      tiktok?: string;
      youtube?: string;
    }>(),
    // Clerk user id when they were signed in — lets us grant hosting later
    // without matching on email.
    userId: text("user_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("waitlist_signups_email_idx").on(table.email)],
);

/**
 * Creators we've sourced from TikTok search and want to recruit as hosts.
 *
 * Unlike `waitlist_signups` (inbound — they came to us), these are outbound:
 * an admin searches a keyword at /admin/creator-outreach, we pull matching
 * accounts, and any that publish a contact email in their bio become
 * prospects. One row per platform account, so re-running the same search
 * refreshes follower counts instead of stacking duplicates.
 */
export const outreachStatus = pgEnum("outreach_status", [
  "new",
  "drafted",
  "contacted",
  "replied",
  "onboarded",
  "passed",
]);

export const creatorProspects = pgTable(
  "creator_prospects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Only TikTok today, but the column keeps the table honest when we add IG.
    platform: text("platform").notNull().default("tiktok"),
    // Platform's own numeric id — survives a handle change.
    platformUserId: text("platform_user_id"),
    // Stored lowercased so the unique index dedupes across search runs.
    handle: text("handle").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    // Full profile bio. Kept verbatim: it's what the email draft is grounded in.
    bio: text("bio"),
    // Link in their bio (Linktree, IG, store) — useful context for the draft.
    bioLink: text("bio_link"),
    followerCount: integer("follower_count").notNull().default(0),
    verified: boolean("verified").notNull().default(false),
    // Scraped out of `bio` on import, then editable by hand. Null means we
    // found no public contact address and can't email them.
    email: text("email"),
    // The search keyword that surfaced them, for judging which queries work.
    discoveredVia: text("discovered_via"),
    status: outreachStatus("status").notNull().default("new"),
    // Last AI-generated draft, held so an admin can edit before sending.
    draftSubject: text("draft_subject"),
    draftBody: text("draft_body"),
    notes: text("notes"),
    contactedAt: timestamp("contacted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("creator_prospects_platform_handle_idx").on(
      table.platform,
      table.handle,
    ),
    index("creator_prospects_status_idx").on(table.status),
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
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type WaitlistSignup = typeof waitlistSignups.$inferSelect;
export type NewWaitlistSignup = typeof waitlistSignups.$inferInsert;
export type CreatorProspect = typeof creatorProspects.$inferSelect;
export type NewCreatorProspect = typeof creatorProspects.$inferInsert;
export type OutreachStatus = (typeof outreachStatus.enumValues)[number];
