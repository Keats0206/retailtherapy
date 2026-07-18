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
