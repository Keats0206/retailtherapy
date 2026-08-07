import { relations } from "drizzle-orm";
import {
  boolean,
  customType,
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

/** pgvector column for semantic search embeddings (1536 dims). */
const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(1536)";
  },
  toDriver(value: number[]) {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string) {
    return value
      .slice(1, -1)
      .split(",")
      .map((part) => Number(part.trim()));
  },
});

// Relative, not the `@/` alias: drizzle-kit loads this file outside Next and
// does not resolve tsconfig paths.
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
 * replay served at /show/<slug> once the show ends.
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

/**
 * A brand-sponsored shopping event a host goes live to attempt: "Spend $500
 * at Net-a-Porter" is the shape. Three things define one — a brand, a budget,
 * and a minimum show length — and together they are the front door of discovery. A viewer
 * arriving to an empty schedule still has something to react to, and a host
 * staring at a blank Go live screen has a format to start from.
 *
 * Curated rather than user-generated: rows are seeded by hand
 * (`scripts/seed-challenges.ts`), so there is no author column. Sponsorship
 * terms (fees, deliverables) live with the deal, not here — this table only
 * carries what a viewer sees.
 */
export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Public handle, used at /c/<slug> and as the ?challenge= hand-off into
    // host setup. Hand-written, unlike a show's random slug.
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    // The brief, in one or two sentences — what the host is actually asked to do.
    prompt: text("prompt").notNull(),
    // The sponsor. `brandDomain` matches `products.retailer` ("net-a-porter.com")
    // so a show's trail can be checked against the store it was meant to shop.
    brandName: text("brand_name").notNull(),
    brandDomain: text("brand_domain"),
    brandLogoUrl: text("brand_logo_url"),
    // Where the host shops. Null falls back to the brand domain.
    storeUrl: text("store_url"),
    // Single emoji standing in for artwork on the card.
    emoji: text("emoji"),
    // The spend cap, in minor units — the "$500" half of the format.
    budgetCents: integer("budget_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    // Minimum show length, in seconds. Null when there is no floor.
    durationSeconds: integer("duration_seconds"),
    // A challenge is a launch event, so it has a slot on the calendar. Hosts
    // can go live for it any time between `startsAt` and `endsAt`; before that
    // it renders as upcoming with a countdown, after it as a wrap-up.
    // Null `startsAt` means always-open — a standing event with no drop date.
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    // Breaks ties between events sharing a slot; the schedule sorts by date first.
    sortOrder: integer("sort_order").notNull().default(0),
    // Retired events stay for the shows that reference them, but drop off
    // discovery.
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("challenges_slug_idx").on(table.slug),
    index("challenges_schedule_idx").on(table.isActive, table.startsAt),
  ],
);

export const streams = pgTable(
  "streams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Short, URL-safe public handle. This — not the uuid — is what appears in
    // the shareable link (/show/<slug>), so it stays short enough to say out loud.
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    // Clerk user id of the host. Scopes "my shows" without a users table.
    hostUserId: text("host_user_id").notNull(),
    hostName: text("host_name"),
    // The challenge this show is an attempt at, if the host started from one.
    // `set null` rather than cascade: retiring a challenge must not delete the
    // shows people recorded for it.
    challengeId: uuid("challenge_id").references(() => challenges.id, {
      onDelete: "set null",
    }),
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
    // Both are null until Mux finishes packaging, which is why /show/<slug> has a
    // "still processing" state (see `resolveRecording` in lib/shows.ts).
    muxAssetId: text("mux_asset_id"),
    muxPlaybackId: text("mux_playback_id"),
    // Actual encoded length from Mux once the asset is ready.
    muxDurationSeconds: integer("mux_duration_seconds"),
    // Whether LiveKit egress ran before the show ended — distinguishes "still
    // packaging" from "nothing was ever recorded".
    recordingCaptured: boolean("recording_captured").notNull().default(false),
    // Plain text from Mux auto-captions, indexed for search.
    transcript: text("transcript"),
    // Denormalized document used to build the embedding (metadata + transcript).
    searchText: text("search_text"),
    embedding: vector1536("embedding"),
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
    index("streams_challenge_idx").on(table.challengeId, table.status),
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
 * A viewer's personal board: items they want to come back to.
 *
 * Keyed by Clerk user id as plain text, the same convention as
 * `streams.host_user_id` — there is still no users table.
 *
 * Note the ordering constraint this creates: a product must exist in
 * `products` before it can be saved, but `persistTrail` only writes the trail
 * there when a show ends. Saving from a live show therefore upserts the
 * product first — see `upsertProduct` in lib/shows.ts.
 */
export const savedItems = pgTable(
  "saved_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // The show it was saved from, for the "from <host>'s show" line on the
    // board. `set null` rather than cascade: a host deleting their show must
    // not silently empty someone else's board.
    sourceStreamId: uuid("source_stream_id").references(() => streams.id, {
      onDelete: "set null",
    }),
    // The host's aside, frozen at save time. It belongs to that show rather
    // than to the product, so it cannot be read back off the `products` row.
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // One row per user per product — saving twice is a no-op, not a duplicate.
    uniqueIndex("saved_items_user_product_idx").on(table.userId, table.productId),
    index("saved_items_user_idx").on(table.userId, table.createdAt),
  ],
);

/** The same board, for whole shows: save the trail rather than one item. */
export const savedShows = pgTable(
  "saved_shows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    streamId: uuid("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("saved_shows_user_stream_idx").on(table.userId, table.streamId),
    index("saved_shows_user_idx").on(table.userId, table.createdAt),
  ],
);

/**
 * How the show felt from behind the camera, asked once on the recap page while
 * the host is still sitting there.
 *
 * Its own table rather than a column on `streams`: this is written by a
 * different actor at a different time than the show record, it is optional, and
 * "rated 3" has to stay distinguishable from "never answered". One row per
 * show — answering again edits the answer.
 */
export const hostFeedback = pgTable(
  "host_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    streamId: uuid("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    // Clerk user id, same convention as `streams.host_user_id`.
    hostUserId: text("host_user_id").notNull(),
    // 1–5. Range is enforced at the route, not the column, so a future scale
    // change doesn't need a migration.
    rating: integer("rating").notNull(),
    // What went wrong, in their words. The rating says how much; this says why.
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("host_feedback_stream_idx").on(table.streamId)],
);

export const waitlistStatus = pgEnum("waitlist_status", [
  "pending",
  "approved",
  "declined",
]);

/**
 * Hosting is invite-only, so /apply collects interest instead of granting
 * access. One row per email — a repeat signup refreshes the details rather
 * than stacking duplicates. Admins approve or decline at /admin/waitlist.
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
    status: waitlistStatus("status").notNull().default("pending"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: text("reviewed_by"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("waitlist_signups_email_idx").on(table.email),
    index("waitlist_signups_status_idx").on(table.status),
  ],
);

export const hostApprovalSource = pgEnum("host_approval_source", [
  "waitlist",
  "migration",
  "manual",
]);

/**
 * Users allowed to create new live shows. Checked alongside HOST_ALLOWLIST
 * env and admin bypass in lib/auth.ts.
 */
export const hostApprovals = pgTable(
  "host_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id"),
    email: text("email").notNull(),
    source: hostApprovalSource("source").notNull(),
    waitlistSignupId: uuid("waitlist_signup_id").references(
      () => waitlistSignups.id,
      { onDelete: "set null" },
    ),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    grantedBy: text("granted_by"),
  },
  (table) => [
    uniqueIndex("host_approvals_user_id_idx").on(table.userId),
    uniqueIndex("host_approvals_email_idx").on(table.email),
  ],
);

export const onboardingIntent = pgEnum("onboarding_intent", [
  "shop",
  "host",
  "both",
]);

/**
 * What a new account told us about itself at /welcome.
 *
 * Not a users table — Clerk remains the user store, and this is keyed by Clerk
 * id as plain text, the same convention as `saved_items` and
 * `streams.host_user_id`. It holds only the onboarding answers.
 *
 * `brands` and `categories` are jsonb string arrays rather than join tables,
 * mirroring `streams.setup`: there is no `brands` table to join against, and
 * the picks are read as a set far more often than they are queried across
 * users. If brand affinity becomes a real query surface, these graduate to a
 * `user_brand_follows` table — the stored values are already stable slugs.
 *
 * `waitlist_signup_id` is set when the answer to "what brings you here" was
 * hosting. Onboarding files the application; it never grants hosting, which
 * still comes only from `host_approvals`.
 */
export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull(),
    intent: onboardingIntent("intent").notNull(),
    brands: jsonb("brands").$type<string[]>().notNull().default([]),
    categories: jsonb("categories").$type<string[]>().notNull().default([]),
    waitlistSignupId: uuid("waitlist_signup_id").references(
      () => waitlistSignups.id,
      { onDelete: "set null" },
    ),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("user_profiles_user_id_idx").on(table.userId)],
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

export const showInterests = pgTable(
  "show_interests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    streamId: uuid("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    userId: text("user_id"),
    email: text("email"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("show_interests_stream_user_idx").on(
      table.streamId,
      table.userId,
    ),
    uniqueIndex("show_interests_stream_email_idx").on(
      table.streamId,
      table.email,
    ),
    index("show_interests_stream_idx").on(table.streamId),
  ],
);

export const showReminderStatus = pgEnum("show_reminder_status", [
  "pending",
  "sent",
  "skipped",
]);

export const showReminderJobs = pgTable(
  "show_reminder_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    streamId: uuid("stream_id")
      .notNull()
      .references(() => streams.id, { onDelete: "cascade" }),
    sendAt: timestamp("send_at", { withTimezone: true }).notNull(),
    status: showReminderStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    index("show_reminder_jobs_pending_idx").on(table.status, table.sendAt),
    index("show_reminder_jobs_stream_idx").on(table.streamId),
  ],
);

export const streamsRelations = relations(streams, ({ many, one }) => ({
  streamProducts: many(streamProducts),
  savedShows: many(savedShows),
  interests: many(showInterests),
  reminderJobs: many(showReminderJobs),
  challenge: one(challenges, {
    fields: [streams.challengeId],
    references: [challenges.id],
  }),
}));

export const challengesRelations = relations(challenges, ({ many }) => ({
  streams: many(streams),
}));

export const productsRelations = relations(products, ({ many }) => ({
  streamProducts: many(streamProducts),
  savedItems: many(savedItems),
}));

export const savedItemsRelations = relations(savedItems, ({ one }) => ({
  product: one(products, {
    fields: [savedItems.productId],
    references: [products.id],
  }),
  sourceStream: one(streams, {
    fields: [savedItems.sourceStreamId],
    references: [streams.id],
  }),
}));

export const savedShowsRelations = relations(savedShows, ({ one }) => ({
  stream: one(streams, {
    fields: [savedShows.streamId],
    references: [streams.id],
  }),
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
export type SavedItem = typeof savedItems.$inferSelect;
export type NewSavedItem = typeof savedItems.$inferInsert;
export type SavedShow = typeof savedShows.$inferSelect;
export type NewSavedShow = typeof savedShows.$inferInsert;
export type WaitlistSignup = typeof waitlistSignups.$inferSelect;
export type NewWaitlistSignup = typeof waitlistSignups.$inferInsert;
export type WaitlistStatus = (typeof waitlistStatus.enumValues)[number];
export type HostApproval = typeof hostApprovals.$inferSelect;
export type NewHostApproval = typeof hostApprovals.$inferInsert;
export type HostApprovalSource = (typeof hostApprovalSource.enumValues)[number];
export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
export type HostFeedback = typeof hostFeedback.$inferSelect;
export type NewHostFeedback = typeof hostFeedback.$inferInsert;
export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type OnboardingIntent = (typeof onboardingIntent.enumValues)[number];
export type CreatorProspect = typeof creatorProspects.$inferSelect;
export type NewCreatorProspect = typeof creatorProspects.$inferInsert;
export type OutreachStatus = (typeof outreachStatus.enumValues)[number];
export type ShowInterest = typeof showInterests.$inferSelect;
export type NewShowInterest = typeof showInterests.$inferInsert;
export type ShowReminderJob = typeof showReminderJobs.$inferSelect;
export type NewShowReminderJob = typeof showReminderJobs.$inferInsert;
