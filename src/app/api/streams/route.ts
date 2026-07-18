import { getHostUser } from "@/lib/auth";
import { getMux, MUX_RTMP_URL } from "@/lib/mux";
import type { Video } from "@mux/mux-node/resources";

// Shape returned to the client for a live stream.
function serialize(stream: Video.LiveStream) {
  return {
    id: stream.id,
    streamKey: stream.stream_key,
    rtmpUrl: MUX_RTMP_URL,
    playbackId: stream.playback_ids?.[0]?.id ?? null,
    status: stream.status,
  };
}

// POST /api/streams — create a new Mux live stream. Restricted to allowed
// hosts (see HOST_ALLOWLIST); the /host page is gated the same way.
export async function POST() {
  const host = await getHostUser();
  if (!host) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const mux = getMux();
    const stream = await mux.video.liveStreams.create({
      playback_policies: ["public"],
      // Each RTMP session is archived as an on-demand asset with public playback.
      new_asset_settings: { playback_policies: ["public"] },
    });

    return Response.json(serialize(stream), { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create live stream";
    return Response.json({ error: message }, { status: 500 });
  }
}

// GET /api/streams — list existing live streams.
export async function GET() {
  try {
    const mux = getMux();
    const page = await mux.video.liveStreams.list({ limit: 25 });
    return Response.json({ streams: page.data.map(serialize) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to list live streams";
    return Response.json({ error: message }, { status: 500 });
  }
}
