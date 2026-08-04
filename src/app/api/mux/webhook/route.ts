import {
  extractRecordingFromAsset,
  fetchMuxCaptionText,
  getMux,
  requestMuxAssetSubtitles,
  unwrapMuxWebhook,
} from "@/lib/mux";
import { indexShowForSearch } from "@/lib/show-search";
import {
  backfillRecording,
  getShowByMuxAssetId,
  getShowByMuxLiveStreamId,
  storeShowTranscript,
} from "@/lib/shows";

// POST /api/mux/webhook — Mux calls this when assets and caption tracks are ready.
//
// Primary path for backfilling muxPlaybackId after a show ends. Polling in
// resolveRecording remains as a fallback for local dev without a webhook tunnel.
//
// Configure in Mux dashboard → Settings → Webhooks → https://<app>/api/mux/webhook
// Subscribe to video.asset.ready and video.asset.track.ready.

export async function POST(request: Request) {
  const body = await request.text();

  let event: Awaited<ReturnType<typeof unwrapMuxWebhook>>;
  try {
    event = await unwrapMuxWebhook(body, request.headers);
  } catch {
    return Response.json({ error: "Mux not configured" }, { status: 503 });
  }

  if (!event) {
    return Response.json(
      { error: "Mux webhooks not configured" },
      { status: 503 },
    );
  }

  try {
    switch (event.type) {
      case "video.asset.ready":
        await handleAssetReady(event.data.id, event.data.live_stream_id);
        break;
      case "video.asset.track.ready":
        await handleTrackReady(event.data);
        break;
      default:
        break;
    }
  } catch {
    // Return 200 so Mux does not retry indefinitely on our side errors; polling
    // is the backstop.
  }

  return Response.json({ ok: true });
}

async function handleAssetReady(
  assetId: string,
  liveStreamId: string | null | undefined,
) {
  const asset = await getMux().video.assets.retrieve(assetId);
  const recording = extractRecordingFromAsset(asset);
  if (!recording) return;

  const streamId = liveStreamId ?? asset.live_stream_id;
  if (!streamId) return;

  const show =
    (await getShowByMuxLiveStreamId(streamId)) ??
    (await getShowByMuxAssetId(assetId));
  if (!show) return;

  await backfillRecording(show, recording);
  void requestMuxAssetSubtitles(assetId).catch(() => {});
}

async function handleTrackReady(track: {
  id?: string;
  type?: string;
  status?: string;
  asset_id?: string;
}) {
  if (track.type !== "text" || track.status !== "ready" || !track.asset_id) {
    return;
  }

  const show = await getShowByMuxAssetId(track.asset_id);
  if (!show?.muxPlaybackId || !track.id) return;

  const transcript = await fetchMuxCaptionText({
    playbackId: show.muxPlaybackId,
    trackId: track.id,
  });
  if (!transcript) return;

  await storeShowTranscript(show.slug, transcript);
  void indexShowForSearch(show.slug).catch(() => {});
}
