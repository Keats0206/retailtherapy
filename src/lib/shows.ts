import "server-only";

import { randomBytes } from "node:crypto";
import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, isNull, lt, notInArray, or, sql } from "drizzle-orm";

import { db, products, streamProducts, streams } from "@/lib/db";
import { getDiscoveryExclusions } from "@/lib/excluded-hosts";
import type { DiscoveryExclusions } from "@/lib/excluded-hosts";
import type { Stream } from "@/lib/db";
import { startRoomRecording, stopRoomRecording } from "@/lib/livekit";
import {
  MUX_RTMP_URL,
  completeMuxLiveStream,
  createMuxLiveStream,
  deleteMuxAsset,
  deleteMuxLiveStream,
  requestMuxAssetSubtitles,
  resolveMuxRecording,
  type RecordingBackfill,
} from "@/lib/mux";
import { indexShowForSearch } from "@/lib/show-search";
import type { ShowSetup } from "@/lib/show-setup";
import { EMPTY, type StreamSnapshot } from "@/lib/stream-store";
import { normalizeSnapshot, spotlightProductId } from "@/lib/interaction-models";
import type { Product } from "@/lib/types";

/**
 * A "show" is one live session, end to end: the LiveKit room it happens in, the
 * Mux recording it leaves behind, and the shopping state it produced.
 *
 * Everything a show touches is keyed off its `slug`, which is what the host
 * shares. The lifecycle is:
 *
 *   createShow   status=live, Mux live stream provisioned, share link exists
 *   startRecording   host has connected → egress mirrors the room to Mux
 *   saveSnapshot     periodic, so a crashed tab still leaves a recap
 *   endShow      egress stopped, Mux told to package, snapshot frozen
 *   resolveRecording lazily fills in the asset once Mux finishes packaging
 *
 * Every mutating function takes `hostUserId` and scopes its write to it, so
 * ownership is enforced here rather than trusted from the route handler.
 */

/** See `lib/live/mode.ts` — the client fakes the transport, so there is no
 * room for an egress to compose and no reason to provision a Mux stream. */
const DESIGN_MODE = process.env.NEXT_PUBLIC_LOCAL_STREAM === "1";

const SLUG_ALPHABET = "abcdefghijkmnopqrstuvwxyz23456789";

/**
 * Short, lowercase, unambiguous handle for the share link. No 0/o/1/l — these
 * get read aloud and typed by hand. 8 chars of a 33-symbol alphabet is ~40 bits,
 * far more than enough to make guessing another host's show impractical.
 */
function generateSlug(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (const byte of bytes) out += SLUG_ALPHABET[byte % SLUG_ALPHABET.length];
  return out;
}

export type Show = Stream;

/**
 * Anything carrying a snapshot column: a full row, or the trimmed projection
 * the discovery cards select (see `showCardColumns`).
 */
type WithSnapshot = { snapshot: unknown };

/** A show, plus the shopping state it recorded. */
export function snapshotOf(show: WithSnapshot): StreamSnapshot {
  if (!show.snapshot) return EMPTY;
  const normalized = normalizeSnapshot(show.snapshot);
  return {
    ...EMPTY,
    ...normalized,
    voters: normalized.voters ?? {},
  };
}

export type TrailPreviewItem = {
  imageUrl: string;
  name: string;
};

/** First few pinned products for show list cards. */
export function trailPreview(
  show: WithSnapshot,
  limit = 4,
): TrailPreviewItem[] {
  return snapshotOf(show)
    .trail.slice(0, limit)
    .map((product) => ({
      imageUrl: product.imageUrl ?? "",
      name: product.name,
    }));
}

export async function getShowBySlug(slug: string): Promise<Show | null> {
  const [show] = await db
    .select()
    .from(streams)
    .where(eq(streams.slug, slug))
    .limit(1);
  return show ?? null;
}

export async function getShowByRoomName(roomName: string): Promise<Show | null> {
  const [show] = await db
    .select()
    .from(streams)
    .where(eq(streams.roomName, roomName))
    .limit(1);
  return show ?? null;
}

export async function getShowByMuxLiveStreamId(
  liveStreamId: string,
): Promise<Show | null> {
  const [show] = await db
    .select()
    .from(streams)
    .where(eq(streams.muxLiveStreamId, liveStreamId))
    .limit(1);
  return show ?? null;
}

export async function getShowByMuxAssetId(assetId: string): Promise<Show | null> {
  const [show] = await db
    .select()
    .from(streams)
    .where(eq(streams.muxAssetId, assetId))
    .limit(1);
  return show ?? null;
}

/** Write Mux playback ids onto a show once the asset is ready. */
export async function backfillRecording(
  show: Show,
  recording: RecordingBackfill,
): Promise<Show> {
  if (show.muxPlaybackId) return show;

  const [updated] = await db
    .update(streams)
    .set({
      muxAssetId: recording.assetId,
      muxPlaybackId: recording.playbackId,
      muxDurationSeconds:
        recording.duration != null ? Math.round(recording.duration) : null,
      updatedAt: new Date(),
    })
    .where(eq(streams.id, show.id))
    .returning();

  return updated ?? show;
}

export async function storeShowTranscript(
  slug: string,
  transcript: string,
): Promise<void> {
  await db
    .update(streams)
    .set({ transcript, updatedAt: new Date() })
    .where(eq(streams.slug, slug));
}

/** Public discovery cards for the homepage. */
export type DiscoveryShow = {
  slug: string;
  title: string;
  host: string;
  pinnedProduct?: string;
  thumbnailUrl: string;
  trailPreview: TrailPreviewItem[];
  trailExtraCount: number;
  /** Every product shown during the show, not just the previewed ones. */
  trailTotal: number;
  endedAt?: string | null;
  scheduledFor?: string | null;
};

function discoveryThumbnail(label: string, tone = 18): string {
  const bg = `hsl(0 0% ${tone}%)`;
  const fg = tone > 50 ? "#00000055" : "#ffffff88";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="${bg}"/><text x="320" y="188" fill="${fg}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18" letter-spacing="3" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** The columns a discovery card reads — a `Show` row satisfies this too. */
type ShowCard = {
  slug: string;
  title: string;
  hostName: string | null;
  endedAt: Date | null;
  scheduledFor?: Date | null;
  snapshot: unknown;
};

/**
 * A card renders only `active` and `trail`, but `voters` grows with audience
 * size times votes cast — unbounded, and the bulk of a busy show's snapshot.
 * Rebuilding the two fields we read in the query keeps a browse page from
 * dragging every vote record of every listed show across the wire.
 *
 * `normalizeSnapshot` defaults the omitted maps to empty, so the value this
 * produces is indistinguishable from the full row downstream.
 */
const showCardColumns = {
  slug: streams.slug,
  title: streams.title,
  hostName: streams.hostName,
  endedAt: streams.endedAt,
  scheduledFor: streams.scheduledFor,
  snapshot: sql<Pick<StreamSnapshot, "active" | "trail"> | null>`
    case when ${streams.snapshot} is null then null else jsonb_build_object(
      'active', ${streams.snapshot} -> 'active',
      'trail', coalesce(${streams.snapshot} -> 'trail', '[]'::jsonb)
    ) end
  `,
};

export function toDiscoveryShow(
  show: ShowCard,
  opts?: {
    placeholderLabel?: string;
    includeEndedAt?: boolean;
    includeScheduledFor?: boolean;
  },
): DiscoveryShow {
  const snapshot = snapshotOf(show);
  const pinned =
    snapshot.trail.find((p) => p.id === spotlightProductId(snapshot)) ??
    snapshot.trail[0];
  const previewLimit = 4;
  const previews = trailPreview(show, previewLimit);
  const trailExtraCount = Math.max(0, snapshot.trail.length - previewLimit);
  const placeholder = opts?.placeholderLabel ?? "LIVE";
  return {
    slug: show.slug,
    title: show.title,
    host: show.hostName ?? "Host",
    pinnedProduct: pinned?.name,
    thumbnailUrl: pinned?.imageUrl ?? discoveryThumbnail(placeholder),
    trailPreview: previews,
    trailExtraCount,
    trailTotal: snapshot.trail.length,
    ...(opts?.includeEndedAt
      ? { endedAt: show.endedAt?.toISOString() ?? null }
      : {}),
    ...(opts?.includeScheduledFor
      ? { scheduledFor: show.scheduledFor?.toISOString() ?? null }
      : {}),
  };
}

/**
 * Every browse and home render asks for the same live shows, so this is served
 * from the cache for `revalidate` seconds rather than from the database.
 *
 * `DiscoveryShow` is plain JSON by construction (note `endedAt` is stringified
 * in `toDiscoveryShow`), which is what makes it safe to hand to the cache.
 *
 * Next 16 supersedes `unstable_cache` with the `use cache` directive, but that
 * needs the `cacheComponents` flag this app has not opted into yet.
 */
const listLiveShowsCached = unstable_cache(
  async (limit: number) => {
    const excluded = await getDiscoveryExclusions();
    const rows = await listLiveShowCards(limit, excluded);
    return rows.map((show) => toDiscoveryShow(show));
  },
  ["list-live-shows"],
  { revalidate: 10 },
);

export async function listLiveShows(limit = 12): Promise<DiscoveryShow[]> {
  return listLiveShowsCached(limit);
}

/** All live shows, for admin moderation. */
export async function listLiveShowsForAdmin(limit = 50): Promise<Show[]> {
  return listLiveShowRows(limit);
}

/** Past shows across every host, for admin moderation. */
export async function listPastShowsForAdmin(limit = 50): Promise<Show[]> {
  return db
    .select()
    .from(streams)
    .where(eq(streams.status, "ended"))
    .orderBy(desc(streams.endedAt))
    .limit(limit);
}

/** Force-end every live show. Returns slugs that were successfully ended. */
export async function endAllLiveShows(limit = 50): Promise<string[]> {
  const live = await listLiveShowRows(limit);
  const endedSlugs: string[] = [];

  for (const show of live) {
    const ended = await endShow(show.slug, show.hostUserId, snapshotOf(show));
    if (ended?.status === "ended") {
      endedSlugs.push(ended.slug);
    }
  }

  return endedSlugs;
}

async function listLiveShowRows(limit: number): Promise<Show[]> {
  return db
    .select()
    .from(streams)
    .where(eq(streams.status, "live"))
    .orderBy(desc(streams.startedAt))
    .limit(limit);
}

function discoveryWhere(
  status: "live" | "ended" | "scheduled",
  excluded: DiscoveryExclusions,
) {
  const filters = [eq(streams.status, status)];

  if (excluded.hostIds.size > 0) {
    filters.push(notInArray(streams.hostUserId, [...excluded.hostIds]));
  }

  if (excluded.hostNames.size > 0) {
    filters.push(
      or(
        isNull(streams.hostName),
        notInArray(streams.hostName, [...excluded.hostNames]),
      )!,
    );
  }

  return filters.length === 1 ? filters[0] : and(...filters);
}

function listLiveShowCards(limit: number, excluded: DiscoveryExclusions) {
  return db
    .select(showCardColumns)
    .from(streams)
    .where(discoveryWhere("live", excluded))
    .orderBy(desc(streams.startedAt))
    .limit(limit);
}

function listEndedShowCards(limit: number, excluded: DiscoveryExclusions) {
  return db
    .select(showCardColumns)
    .from(streams)
    .where(discoveryWhere("ended", excluded))
    .orderBy(desc(streams.endedAt))
    .limit(limit);
}

function listScheduledShowCards(limit: number, excluded: DiscoveryExclusions) {
  return db
    .select(showCardColumns)
    .from(streams)
    .where(discoveryWhere("scheduled", excluded))
    .orderBy(asc(streams.scheduledFor), desc(streams.createdAt))
    .limit(limit);
}

export async function listEndedShows(limit = 24): Promise<DiscoveryShow[]> {
  const excluded = await getDiscoveryExclusions();
  const rows = await listEndedShowCards(limit, excluded);
  return rows.map((show) =>
    toDiscoveryShow(show, { placeholderLabel: "RECAP", includeEndedAt: true }),
  );
}

const listScheduledShowsCached = unstable_cache(
  async (limit: number) => {
    const excluded = await getDiscoveryExclusions();
    const rows = await listScheduledShowCards(limit, excluded);
    return rows.map((show) =>
      toDiscoveryShow(show, {
        placeholderLabel: "SOON",
        includeScheduledFor: true,
      }),
    );
  },
  ["list-scheduled-shows"],
  { revalidate: 10 },
);

export async function listScheduledShows(
  limit = 12,
): Promise<DiscoveryShow[]> {
  return listScheduledShowsCached(limit);
}

export async function listShowsForHost(hostUserId: string): Promise<Show[]> {
  return db
    .select()
    .from(streams)
    .where(eq(streams.hostUserId, hostUserId))
    .orderBy(desc(streams.createdAt))
    .limit(50);
}

export async function getLiveShowForHost(
  hostUserId: string,
): Promise<Show | null> {
  const [show] = await db
    .select()
    .from(streams)
    .where(and(eq(streams.hostUserId, hostUserId), eq(streams.status, "live")))
    .orderBy(desc(streams.startedAt))
    .limit(1);
  return show ?? null;
}

/**
 * Design mode never joins a LiveKit room, so the room_finished webhook never
 * fires and tab-close keepalive is the only cleanup — which often doesn't run.
 * End orphaned design-mode live rows (no Mux stream was provisioned) so /host
 * doesn't keep surfacing a ghost show from a previous dev session.
 *
 * Skips shows touched in the last 30s so a go-live → /host redirect isn't
 * ended mid-flight.
 */
export async function endDesignModeOrphansForHost(
  hostUserId: string,
): Promise<void> {
  if (!DESIGN_MODE) return;

  const existing = await getLiveShowForHost(hostUserId);
  if (!existing || existing.muxLiveStreamId) return;

  const ageMs = Date.now() - existing.updatedAt.getTime();
  if (ageMs < 30_000) return;

  await endShow(existing.slug, hostUserId, snapshotOf(existing));
}

/**
 * Hours without a snapshot update before a live show is considered stale. This
 * is only a backstop now — the LiveKit `room_finished` webhook ends shows
 * within minutes of the host leaving. It catches the case where the webhook
 * never arrives (misconfigured, or LiveKit couldn't reach us), while still
 * leaving a comfortable window for a host to reconnect a dropped session.
 */
export const STALE_SHOW_HOURS = 2;

/**
 * Opens a show. The row and the Mux live stream are created up front so the
 * host has a working share link the instant they click Go live — before the
 * camera is even on. The egress starts later (see `startRecording`), because a
 * room composite needs the room to have someone in it.
 */
export async function createShow(opts: {
  hostUserId: string;
  hostName: string | null;
  title: string;
  setup?: ShowSetup | null;
  /** The challenge event this show attempts, already resolved and validated. */
  challengeId?: string | null;
}): Promise<Show> {
  const existing = await getLiveShowForHost(opts.hostUserId);
  if (existing) {
    // Design-mode shows never get a Mux stream and never join a real room, so
    // a leftover `live` row is always an orphan — end it and start fresh.
    if (DESIGN_MODE && !existing.muxLiveStreamId) {
      await endShow(existing.slug, opts.hostUserId, snapshotOf(existing));
    } else {
      throw new Error(
        "You already have a live show. Open studio to reconnect, or end it first.",
      );
    }
  }

  const slug = generateSlug();
  let liveStreamId: string | null = null;

  try {
    // Design mode never sends a frame to Mux, so provisioning a live stream
    // would only leave a dangling resource. A show with no stream key simply
    // never records — `startRecording` and `endShow` both already treat that
    // as a normal state.
    const mux = DESIGN_MODE ? null : await createMuxLiveStream();
    liveStreamId = mux?.liveStreamId ?? null;
    const streamKey = mux?.streamKey ?? null;

    const [show] = await db
      .insert(streams)
      .values({
        slug,
        title: opts.title,
        hostUserId: opts.hostUserId,
        hostName: opts.hostName,
        status: "live",
        roomName: `show_${slug}`,
        muxLiveStreamId: liveStreamId,
        muxStreamKey: streamKey,
        snapshot: EMPTY,
        setup: opts.setup ?? null,
        challengeId: opts.challengeId ?? null,
        startedAt: new Date(),
      })
      .returning();

    return show;
  } catch (err) {
    if (liveStreamId) {
      await deleteMuxLiveStream(liveStreamId);
    }
    throw err;
  }
}

/**
 * Starts mirroring the room to Mux. Called once the host's browser reports it
 * has connected.
 *
 * Idempotent: a re-render or a reconnect can fire this twice, and starting a
 * second egress would push two feeds into the same Mux stream.
 */
export async function startRecording(
  slug: string,
  hostUserId: string,
): Promise<Show | null> {
  const show = await getShowBySlug(slug);
  if (!show || show.hostUserId !== hostUserId) return null;
  if (show.egressId) return show;
  if (!show.muxStreamKey) return show;
  // No real room exists to compose in design mode.
  if (DESIGN_MODE) return show;

  const egressId = await startRoomRecording({
    room: show.roomName,
    rtmpUrl: `${MUX_RTMP_URL}/${show.muxStreamKey}`,
  });

  const [updated] = await db
    .update(streams)
    .set({ egressId, updatedAt: new Date() })
    .where(and(eq(streams.id, show.id), eq(streams.hostUserId, hostUserId)))
    .returning();

  return updated ?? show;
}

/**
 * Checkpoints the shopping state mid-show. Only meaningful while live — a
 * late-arriving autosave must never overwrite the frozen final snapshot.
 */
export async function saveSnapshot(
  slug: string,
  hostUserId: string,
  snapshot: StreamSnapshot,
): Promise<boolean> {
  const rows = await db
    .update(streams)
    .set({ snapshot, updatedAt: new Date() })
    .where(
      and(
        eq(streams.slug, slug),
        eq(streams.hostUserId, hostUserId),
        eq(streams.status, "live"),
      ),
    )
    .returning({ id: streams.id });

  return rows.length > 0;
}

/**
 * Closes the show: stop the mirror, tell Mux to package, freeze the shopping
 * state.
 *
 * The vendor calls are best-effort and deliberately not allowed to fail the
 * whole operation. If LiveKit or Mux is having a bad minute, the host still
 * gets their show marked ended with its trail intact; the recording is
 * recoverable afterwards, an un-ended show is not.
 */
export async function endShow(
  slug: string,
  hostUserId: string,
  snapshot: StreamSnapshot | null,
): Promise<Show | null> {
  const show = await getShowBySlug(slug);
  if (!show || show.hostUserId !== hostUserId) return null;
  if (show.status === "ended") return show;

  if (show.egressId) {
    try {
      await stopRoomRecording(show.egressId);
    } catch {
      // Already stopped — the last participant leaving ends an egress on its
      // own, and this races that.
    }
  }

  if (show.muxLiveStreamId) {
    try {
      await completeMuxLiveStream(show.muxLiveStreamId);
    } catch {
      // Mux closes the stream after the reconnect window regardless; this only
      // makes it happen sooner.
    }
  }

  const final = snapshot ?? snapshotOf(show);

  const [updated] = await db
    .update(streams)
    .set({
      status: "ended",
      endedAt: new Date(),
      snapshot: final,
      recordingCaptured: !!show.egressId,
      // The key has no use once the broadcast is over, and it is a credential.
      muxStreamKey: null,
      egressId: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(streams.id, show.id),
        eq(streams.hostUserId, hostUserId),
        eq(streams.status, "live"),
      ),
    )
    .returning();

  if (!updated) return null;

  try {
    await persistTrail(show.id, final);
  } catch {
    // The row is already ended; relational trail backfill is best-effort.
  }

  void indexShowForSearch(updated.slug).catch(() => {});

  return updated;
}

/**
 * Ends the show attached to a LiveKit room. Called from the `room_finished`
 * webhook: a room going empty is the authoritative "the host is gone" signal,
 * so we end promptly instead of waiting for the stale sweep hours later.
 *
 * No-ops unless the show is still live, so a duplicate webhook delivery (LiveKit
 * retries) can't disturb an already-frozen recap.
 */
export async function endShowByRoomName(roomName: string): Promise<Show | null> {
  const show = await getShowByRoomName(roomName);
  if (!show || show.status !== "live") return null;
  return endShow(show.slug, show.hostUserId, null);
}

/**
 * Writes the show's trail into the relational tables.
 *
 * The snapshot jsonb is what renders the replay, so this is not on the critical
 * path — it exists so products and their tallies are queryable across shows
 * ("what did the room actually buy?") without unpacking json.
 */
async function persistTrail(streamId: string, snapshot: StreamSnapshot) {
  if (snapshot.trail.length === 0) return;

  const spotlightId = spotlightProductId(snapshot);

  // `addToTrail` already dedupes by id, but the snapshot is client-supplied
  // jsonb. A repeated id would make one statement hit the same row twice, which
  // Postgres rejects outright ("cannot affect row a second time") and would
  // abort the whole batch — so collapse duplicates before building it.
  const items = new Map<string, { item: Product; position: number }>();
  for (const [position, item] of snapshot.trail.entries()) {
    if (item.id) items.set(item.id, { item, position });
  }
  if (items.size === 0) return;

  // One statement per table rather than two per product: a 30-item trail was 60
  // serial round-trips, each one holding the end-of-show request open.
  const productRows = await db
    .insert(products)
    .values([...items.values()].map(({ item }) => toProductRow(item)))
    .onConflictDoUpdate({
      target: products.externalId,
      set: {
        title: sql`excluded.title`,
        imageUrl: sql`excluded.image_url`,
        priceCents: sql`excluded.price_cents`,
        currency: sql`excluded.currency`,
        retailer: sql`excluded.retailer`,
        buyUrl: sql`excluded.buy_url`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: products.id, externalId: products.externalId });

  const idByExternalId = new Map(
    productRows.flatMap((row) =>
      row.externalId ? [[row.externalId, row.id] as const] : [],
    ),
  );

  const joinRows = [...items.values()].flatMap(({ item, position }) => {
    const productId = idByExternalId.get(item.id);
    if (!productId) return [];
    const tally = snapshot.votes[item.id] ?? { buy: 0, skip: 0 };
    return [
      {
        streamId,
        productId,
        position,
        isSpotlighted: spotlightId === item.id,
        note: item.note || null,
        buyVotes: tally.buy,
        skipVotes: tally.skip,
      },
    ];
  });
  if (joinRows.length === 0) return;

  await db
    .insert(streamProducts)
    .values(joinRows)
    .onConflictDoUpdate({
      target: [streamProducts.streamId, streamProducts.productId],
      set: {
        position: sql`excluded.position`,
        isSpotlighted: sql`excluded.is_spotlighted`,
        note: sql`excluded.note`,
        buyVotes: sql`excluded.buy_votes`,
        skipVotes: sql`excluded.skip_votes`,
      },
    });
}

/**
 * Writes one app-facing product into the `products` table, returning its row
 * id. The single definition of "this item exists in the catalog" — used both
 * when a show ends (`persistTrail`) and when a viewer saves an item mid-show
 * (`lib/saved.ts`), which is the only way a live product reaches the table
 * before the show is over.
 *
 * Returns null for an item with no external id: the column is nullable but
 * carries a unique index, so `onConflictDoUpdate` on it has nothing to match
 * and every such insert would stack a duplicate row.
 */
export async function upsertProduct(item: Product): Promise<string | null> {
  if (!item.id) return null;

  const [row] = await db
    .insert(products)
    .values(toProductRow(item))
    .onConflictDoUpdate({
      target: products.externalId,
      set: {
        title: item.name,
        imageUrl: item.imageUrl,
        priceCents: Math.round(item.price * 100),
        currency: item.currency,
        retailer: item.retailer,
        buyUrl: item.buyUrl,
        updatedAt: new Date(),
      },
    })
    .returning({ id: products.id });

  return row?.id ?? null;
}

function toProductRow(item: Product) {
  return {
    externalId: item.id,
    title: item.name,
    imageUrl: item.imageUrl,
    // App-facing prices are dollars; the column is cents.
    priceCents: Math.round(item.price * 100),
    currency: item.currency,
    retailer: item.retailer,
    buyUrl: item.buyUrl,
  };
}

/**
 * The read direction of `toProductRow`: a persisted row back into the
 * app-facing `Product` the UI renders.
 *
 * The row cannot carry everything — commission and availability come from
 * Channel3 at lookup time and are not stored — so those fall back to neutral
 * values. `note` and `addedAt` belong to the context the product was seen in
 * (a show, a save), so the caller supplies them.
 */
export function toProduct(
  row: typeof products.$inferSelect,
  extras?: { note?: string | null; addedAt?: number },
): Product {
  return {
    id: row.externalId ?? row.id,
    name: row.title,
    imageUrl: row.imageUrl,
    // The column is cents; app-facing prices are dollars.
    price: row.priceCents / 100,
    currency: row.currency,
    retailer: row.retailer ?? "",
    buyUrl: row.buyUrl ?? "",
    commissionRate: 0,
    availability: null,
    note: extras?.note ?? "",
    addedAt: extras?.addedAt ?? row.createdAt.getTime(),
  };
}

/**
 * Fills in the Mux asset for a finished show, once Mux has packaged it.
 *
 * Called on render of /show/<slug>, so the first viewer after processing finishes
 * is the one who backfills it and every viewer after that reads it straight
 * from the row. Returns the show unchanged if the recording is not ready yet —
 * the page renders a "still processing" state and polls.
 */
/**
 * Removes a finished show from the host's home. Live shows must be ended
 * first — deleting an active room would strand viewers on a dead link.
 */
export async function deleteShow(
  slug: string,
  hostUserId: string,
): Promise<Show | null> {
  const show = await getShowBySlug(slug);
  if (!show || show.hostUserId !== hostUserId) return null;
  if (show.status === "live") return null;

  return removeShow(show);
}

/**
 * Admin counterpart to `deleteShow`: removes a finished show regardless of who
 * hosted it. Live shows are still off limits — force-end them first, so viewers
 * land on the recap instead of a dead link.
 */
export async function deleteShowAsAdmin(slug: string): Promise<Show | null> {
  const show = await getShowBySlug(slug);
  if (!show || show.status === "live") return null;

  return removeShow(show);
}

/** Drops the Mux artifacts, then the row. Ownership is checked by the caller. */
async function removeShow(show: Show): Promise<Show> {
  if (show.muxLiveStreamId) {
    await deleteMuxLiveStream(show.muxLiveStreamId);
  }
  if (show.muxAssetId) {
    await deleteMuxAsset(show.muxAssetId);
  }

  const [deleted] = await db
    .delete(streams)
    .where(eq(streams.id, show.id))
    .returning();

  if (!deleted) {
    throw new Error("Show not found");
  }

  return deleted;
}

/**
 * Ends live shows whose snapshot has not been updated recently — typically a
 * host who closed the tab without ending cleanly.
 */
export async function endStaleShows(
  staleAfterHours = STALE_SHOW_HOURS,
): Promise<number> {
  const cutoff = new Date(Date.now() - staleAfterHours * 60 * 60 * 1000);
  // The cutoff belongs in the query: this runs on a timer, and every live show
  // that is still healthy is a row we would otherwise fetch only to discard.
  const stale = await db
    .select()
    .from(streams)
    .where(
      and(
        eq(streams.status, "live"),
        lt(
          sql`coalesce(${streams.updatedAt}, ${streams.startedAt}, ${streams.createdAt})`,
          cutoff,
        ),
      ),
    );

  let ended = 0;
  for (const show of stale) {
    const result = await endShow(show.slug, show.hostUserId, snapshotOf(show));
    if (result?.status === "ended") ended += 1;
  }
  return ended;
}

export async function resolveRecording(show: Show): Promise<Show> {
  if (show.muxPlaybackId) return show;
  if (show.status !== "ended" || !show.muxLiveStreamId) return show;

  let recording: RecordingBackfill | null = null;
  try {
    recording = await resolveMuxRecording(show.muxLiveStreamId);
  } catch {
    return show;
  }
  if (!recording) return show;

  const updated = await backfillRecording(show, recording);
  void requestMuxAssetSubtitles(recording.assetId).catch(() => {});
  return updated;
}
