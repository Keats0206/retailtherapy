import "server-only";

import { randomBytes } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

import { db, products, streamProducts, streams } from "@/lib/db";
import type { Stream } from "@/lib/db";
import { startRoomRecording, stopRoomRecording } from "@/lib/livekit";
import {
  MUX_RTMP_URL,
  completeMuxLiveStream,
  createMuxLiveStream,
  deleteMuxAsset,
  deleteMuxLiveStream,
  resolveMuxRecording,
} from "@/lib/mux";
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

/** A show, plus the shopping state it recorded. */
export function snapshotOf(show: Show): StreamSnapshot {
  return show.snapshot ? normalizeSnapshot(show.snapshot) : EMPTY;
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

/** Public discovery cards for the homepage. */
export type DiscoveryShow = {
  slug: string;
  title: string;
  host: string;
  pinnedProduct?: string;
  thumbnailUrl: string;
};

function discoveryThumbnail(label: string, tone = 18): string {
  const bg = `hsl(0 0% ${tone}%)`;
  const fg = tone > 50 ? "#00000055" : "#ffffff88";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="${bg}"/><text x="320" y="188" fill="${fg}" font-family="ui-sans-serif,system-ui,sans-serif" font-size="18" letter-spacing="3" text-anchor="middle">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function toDiscoveryShow(show: Show): DiscoveryShow {
  const snapshot = snapshotOf(show);
  const pinned =
    snapshot.trail.find((p) => p.id === spotlightProductId(snapshot)) ??
    snapshot.trail[0];
  return {
    slug: show.slug,
    title: show.title,
    host: show.hostName ?? "Host",
    pinnedProduct: pinned?.name,
    thumbnailUrl: pinned?.imageUrl ?? discoveryThumbnail("LIVE"),
  };
}

export async function listLiveShows(limit = 12): Promise<DiscoveryShow[]> {
  const rows = await listLiveShowRows(limit);
  return rows.map(toDiscoveryShow);
}

/** All live shows, for admin moderation. */
export async function listLiveShowsForAdmin(limit = 50): Promise<Show[]> {
  return listLiveShowRows(limit);
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
}): Promise<Show> {
  const existing = await getLiveShowForHost(opts.hostUserId);
  if (existing) {
    throw new Error(
      "You already have a live show. Open studio to reconnect, or end it first.",
    );
  }

  const slug = generateSlug();
  let liveStreamId: string | null = null;

  try {
    const mux = await createMuxLiveStream();
    liveStreamId = mux.liveStreamId;
    const { streamKey } = mux;

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

  for (const [position, item] of snapshot.trail.entries()) {
    const tally = snapshot.votes[item.id] ?? { buy: 0, skip: 0 };

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

    if (!row) continue;

    await db
      .insert(streamProducts)
      .values({
        streamId,
        productId: row.id,
        position,
        isSpotlighted: spotlightId === item.id,
        note: item.note || null,
        buyVotes: tally.buy,
        skipVotes: tally.skip,
      })
      .onConflictDoUpdate({
        target: [streamProducts.streamId, streamProducts.productId],
        set: {
          position,
          isSpotlighted: spotlightId === item.id,
          note: item.note || null,
          buyVotes: tally.buy,
          skipVotes: tally.skip,
        },
      });
  }
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
 * Fills in the Mux asset for a finished show, once Mux has packaged it.
 *
 * Called on render of /s/<slug>, so the first viewer after processing finishes
 * is the one who backfills it and every viewer after that reads it straight
 * from the row. Returns the show unchanged if the recording is not ready yet —
 * the page renders a "still processing" state and polls.
 */
/**
 * Removes a finished show from the host's dashboard. Live shows must be ended
 * first — deleting an active room would strand viewers on a dead link.
 */
export async function deleteShow(
  slug: string,
  hostUserId: string,
): Promise<Show | null> {
  const show = await getShowBySlug(slug);
  if (!show || show.hostUserId !== hostUserId) return null;
  if (show.status === "live") return null;

  if (show.muxLiveStreamId) {
    await deleteMuxLiveStream(show.muxLiveStreamId);
  }
  if (show.muxAssetId) {
    await deleteMuxAsset(show.muxAssetId);
  }

  await db
    .delete(streams)
    .where(and(eq(streams.id, show.id), eq(streams.hostUserId, hostUserId)));

  return show;
}

/**
 * Ends live shows whose snapshot has not been updated recently — typically a
 * host who closed the tab without ending cleanly.
 */
export async function endStaleShows(
  staleAfterHours = STALE_SHOW_HOURS,
): Promise<number> {
  const cutoff = new Date(Date.now() - staleAfterHours * 60 * 60 * 1000);
  const stale = await db
    .select()
    .from(streams)
    .where(eq(streams.status, "live"));

  let ended = 0;
  for (const show of stale) {
    const lastActivity = show.updatedAt ?? show.startedAt ?? show.createdAt;
    if (lastActivity >= cutoff) continue;

    const result = await endShow(show.slug, show.hostUserId, snapshotOf(show));
    if (result?.status === "ended") ended += 1;
  }
  return ended;
}

export async function resolveRecording(show: Show): Promise<Show> {
  if (show.muxPlaybackId) return show;
  if (show.status !== "ended" || !show.muxLiveStreamId) return show;

  let recording: Awaited<ReturnType<typeof resolveMuxRecording>> = null;
  try {
    recording = await resolveMuxRecording(show.muxLiveStreamId);
  } catch {
    return show;
  }
  if (!recording) return show;

  const [updated] = await db
    .update(streams)
    .set({
      muxAssetId: recording.assetId,
      muxPlaybackId: recording.playbackId,
      updatedAt: new Date(),
    })
    .where(eq(streams.id, show.id))
    .returning();

  return updated ?? show;
}
