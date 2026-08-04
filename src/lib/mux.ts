import "server-only";
import Mux from "@mux/mux-node";

// Mux live-stream ingest + playback constants.
// Broadcast software (OBS, etc.) pushes to the RTMPS URL using the stream key.
// Viewers watch via https://stream.mux.com/<playbackId>.m3u8 (handled by Mux Player).
export const MUX_RTMP_URL = "rtmps://global-live.mux.com:443/app";

export type RecordingBackfill = {
  assetId: string;
  playbackId: string;
  duration: number | null;
};

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

function getMuxWebhookSecret(): string | null {
  return process.env.MUX_WEBHOOK_SECRET ?? null;
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
    new_asset_settings: {
      playback_policies: ["public"],
      max_resolution_tier: "1080p",
    },
    // Mux rejects generated_subtitles on the live stream when latency_mode is
    // "low". Captions are requested on the VOD asset after the show ends.
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

/** Pull playback id + duration from a ready Mux asset. */
export function extractRecordingFromAsset(asset: {
  id: string;
  status?: string;
  playback_ids?: Array<{ id?: string }> | null;
  duration?: number | null;
}): RecordingBackfill | null {
  if (asset.status !== "ready") return null;

  const playbackId = asset.playback_ids?.[0]?.id;
  if (!playbackId) return null;

  return {
    assetId: asset.id,
    playbackId,
    duration: asset.duration ?? null,
  };
}

/**
 * Finds the recording produced by a finished live stream.
 *
 * Mux creates the asset asynchronously, so this returns `null` while it is
 * still packaging. Webhooks are the primary backfill path; polling remains as a
 * fallback for local dev without a webhook tunnel.
 */
export async function resolveMuxRecording(liveStreamId: string): Promise<RecordingBackfill | null> {
  const mux = getMux();

  const live = await mux.video.liveStreams.retrieve(liveStreamId);
  const assetId = live.recent_asset_ids?.[0];
  if (!assetId) return null;

  const asset = await mux.video.assets.retrieve(assetId);
  return extractRecordingFromAsset(asset);
}

/** Verify and parse a Mux webhook payload. Returns null if webhooks are not configured. */
export async function unwrapMuxWebhook(body: string, headers: Headers) {
  const secret = getMuxWebhookSecret();
  if (!secret) return null;

  const headerRecord: Record<string, string> = {};
  headers.forEach((value, key) => {
    headerRecord[key] = value;
  });

  return getMux().webhooks.unwrap(body, headerRecord, secret);
}

/**
 * Kick off VOD subtitle generation for a finished live recording.
 * Fires video.asset.track.ready when done; see the Mux webhook handler.
 */
export async function requestMuxAssetSubtitles(assetId: string): Promise<void> {
  const mux = getMux();
  const asset = await mux.video.assets.retrieve(assetId);
  const tracks = asset.tracks ?? [];

  const hasSubtitles = tracks.some(
    (track) => track.type === "text" && track.text_type === "subtitles",
  );
  if (hasSubtitles) return;

  const audioTrack = tracks.find(
    (track) => track.type === "audio" && track.status === "ready" && track.id,
  );
  if (!audioTrack?.id) return;

  await mux.video.assets.generateSubtitles(assetId, audioTrack.id, {
    generated_subtitles: [{ language_code: "en", name: "English (auto)" }],
  });
}

/** Fetch auto-generated captions as plain text from a Mux text track. */
export async function fetchMuxCaptionText(opts: {
  playbackId: string;
  trackId: string;
}): Promise<string | null> {
  const url = `https://stream.mux.com/${opts.playbackId}/text/${opts.trackId}.vtt`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const vtt = await res.text();
  return vttToPlainText(vtt);
}

/** Strip WebVTT cues down to spoken text for search indexing. */
export function vttToPlainText(vtt: string): string {
  return vtt
    .split("\n")
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        line !== "WEBVTT" &&
        !line.startsWith("NOTE") &&
        !/^\d+$/.test(line) &&
        !/^\d{2}:\d{2}:\d{2}/.test(line),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
