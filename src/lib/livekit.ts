import "server-only";
import { AccessToken } from "livekit-server-sdk";

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
