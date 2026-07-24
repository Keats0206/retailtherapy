import "server-only";
import Mux from "@mux/mux-node";

// Mux live-stream ingest + playback constants.
// Broadcast software (OBS, etc.) pushes to the RTMPS URL using the stream key.
// Viewers watch via https://stream.mux.com/<playbackId>.m3u8 (handled by Mux Player).
export const MUX_RTMP_URL = "rtmps://global-live.mux.com:443/app";

let client: Mux | null = null;

/**
 * Returns a singleton, server-only Mux client.
 * Reads credentials from MUX_TOKEN_ID / MUX_TOKEN_SECRET (see .env.example).
 */
export function getMux(): Mux {
  if (client) return client;

  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!tokenId || !tokenSecret) {
    throw new Error(
      "Missing Mux credentials. Set MUX_TOKEN_ID and MUX_TOKEN_SECRET in .env.local " +
        "(create an access token at https://dashboard.mux.com → Settings → Access Tokens).",
    );
  }

  client = new Mux({ tokenId, tokenSecret });
  return client;
}

/**
 * Creates the Mux live stream a LiveKit egress pushes into, and returns the
 * RTMP URL to point that egress at.
 *
 * `new_asset_settings` is the part that matters: it tells Mux to archive the
 * broadcast as a public on-demand asset when the stream ends. That asset is the
 * replay. Without it Mux would carry the live feed and then throw it away.
 */
export async function createMuxLiveStream(): Promise<{
  liveStreamId: string;
  streamKey: string;
  rtmpUrl: string;
}> {
  const stream = await getMux().video.liveStreams.create({
    playback_policies: ["public"],
    new_asset_settings: { playback_policies: ["public"] },
    latency_mode: "low",
    // A dropped egress has this long to reconnect before Mux calls the stream
    // over and cuts the asset.
    reconnect_window: 30,
  });

  if (!stream.stream_key) {
    throw new Error("Mux did not return a stream key");
  }

  return {
    liveStreamId: stream.id,
    streamKey: stream.stream_key,
    rtmpUrl: `${MUX_RTMP_URL}/${stream.stream_key}`,
  };
}

/**
 * Tells Mux the broadcast is over so it stops waiting out the reconnect window
 * and starts packaging the asset immediately.
 */
export async function completeMuxLiveStream(liveStreamId: string) {
  await getMux().video.liveStreams.complete(liveStreamId);
}

/** Best-effort cleanup when a show is deleted or create fails mid-flight. */
export async function deleteMuxLiveStream(liveStreamId: string) {
  try {
    await getMux().video.liveStreams.delete(liveStreamId);
  } catch {
    // Already gone or Mux is unavailable — nothing to do.
  }
}

/** Removes a packaged recording asset. */
export async function deleteMuxAsset(assetId: string) {
  try {
    await getMux().video.assets.delete(assetId);
  } catch {
    // Already gone or Mux is unavailable — nothing to do.
  }
}

/**
 * Finds the recording produced by a finished live stream.
 *
 * Mux creates the asset asynchronously, so this returns `null` while it is
 * still packaging — the caller polls rather than us blocking. Deliberately no
 * webhook: polling on page load needs no publicly reachable URL, which keeps
 * local development working the same as production.
 */
export async function resolveMuxRecording(liveStreamId: string): Promise<{
  assetId: string;
  playbackId: string;
  duration: number | null;
} | null> {
  const mux = getMux();

  const live = await mux.video.liveStreams.retrieve(liveStreamId);
  // Most recent first.
  const assetId = live.recent_asset_ids?.[0];
  if (!assetId) return null;

  const asset = await mux.video.assets.retrieve(assetId);
  if (asset.status !== "ready") return null;

  const playbackId = asset.playback_ids?.[0]?.id;
  if (!playbackId) return null;

  return { assetId, playbackId, duration: asset.duration ?? null };
}
