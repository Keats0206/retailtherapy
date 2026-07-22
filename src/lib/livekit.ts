import "server-only";
import {
  AccessToken,
  EgressClient,
  StreamOutput,
  StreamProtocol,
} from "livekit-server-sdk";

/**
 * Server-only LiveKit helpers. LiveKit is the primary live path: creators
 * publish their camera from the browser (WebRTC) and viewers subscribe — no
 * OBS / no download. Credentials come from LIVEKIT_URL / LIVEKIT_API_KEY /
 * LIVEKIT_API_SECRET (see .env.example).
 */

export function getLiveKitConfig() {
  const url = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!url || !apiKey || !apiSecret) {
    throw new Error(
      "Missing LiveKit credentials. Set LIVEKIT_URL, LIVEKIT_API_KEY and " +
        "LIVEKIT_API_SECRET in .env.local (create a project at " +
        "https://cloud.livekit.io → Settings → Keys).",
    );
  }

  return { url, apiKey, apiSecret };
}

/**
 * Mints a room-scoped access token.
 *
 * `canPublish` covers media (camera/mic/screen) and is host-only. Data is a
 * separate grant: viewers must be able to publish *data* so they can chat and
 * vote, while still being unable to publish video or audio.
 */
export async function createAccessToken(opts: {
  room: string;
  identity: string;
  name?: string;
  canPublish: boolean;
}): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitConfig();

  const at = new AccessToken(apiKey, apiSecret, {
    identity: opts.identity,
    name: opts.name,
  });

  at.addGrant({
    roomJoin: true,
    room: opts.room,
    canPublish: opts.canPublish,
    // Everyone may publish data — this is what carries chat and votes.
    canPublishData: true,
    canSubscribe: true,
  });

  return at.toJwt();
}

let egress: EgressClient | null = null;

function getEgressClient(): EgressClient {
  if (egress) return egress;
  const { url, apiKey, apiSecret } = getLiveKitConfig();
  // EgressClient rewrites a ws(s):// host to http(s):// itself, so LIVEKIT_URL
  // can be passed through unchanged.
  egress = new EgressClient(url, apiKey, apiSecret);
  return egress;
}

/**
 * Mirrors a live room to an RTMP destination (here: Mux) so the session is
 * archived while it happens.
 *
 * This is a RoomComposite egress — LiveKit renders the room the way a viewer
 * sees it and encodes that single feed, rather than handing us raw per-track
 * media to stitch together. `speaker` layout means a screen share takes the
 * frame when there is one, which matches the viewer's `Stage`.
 *
 * The room must already exist, so call this only once the host has connected;
 * an egress against an empty room has nothing to compose.
 */
export async function startRoomRecording(opts: {
  room: string;
  rtmpUrl: string;
}): Promise<string> {
  const info = await getEgressClient().startRoomCompositeEgress(
    opts.room,
    new StreamOutput({
      protocol: StreamProtocol.RTMP,
      urls: [opts.rtmpUrl],
    }),
    { layout: "speaker" },
  );

  return info.egressId;
}

/**
 * Stops an in-flight recording. Safe to call for an egress that already
 * stopped on its own (the last participant leaving ends it), which is why the
 * caller treats a failure here as non-fatal — ending the show must not hinge on
 * it.
 */
export async function stopRoomRecording(egressId: string): Promise<void> {
  await getEgressClient().stopEgress(egressId);
}
