import { WebhookReceiver, type WebhookEvent } from "livekit-server-sdk";

import { getLiveKitConfig } from "@/lib/livekit";
import { endShowByRoomName } from "@/lib/shows";

// POST /api/livekit/webhook — LiveKit calls this on room lifecycle events.
//
// We only act on `room_finished`, which fires once a room is fully empty. That
// is the authoritative "the host has left for good" signal: without it, a host
// who closes the tab without pressing End leaves their show stuck `live` until
// the stale sweep catches it hours later.
//
// Point LiveKit at this URL under Settings → Webhooks. It is signed with the
// same API key/secret as the rest of the integration, so no new env var is
// needed — `receive` verifies the signature and rejects anything unsigned.

let receiver: WebhookReceiver | null = null;
function getReceiver(): WebhookReceiver {
  if (receiver) return receiver;
  const { apiKey, apiSecret } = getLiveKitConfig();
  receiver = new WebhookReceiver(apiKey, apiSecret);
  return receiver;
}

export async function POST(request: Request) {
  let verifier: WebhookReceiver;
  try {
    verifier = getReceiver();
  } catch {
    return Response.json({ error: "LiveKit not configured" }, { status: 503 });
  }

  const body = await request.text();
  const authHeader = request.headers.get("Authorization") ?? undefined;

  let event: WebhookEvent;
  try {
    event = await verifier.receive(body, authHeader);
  } catch {
    // Bad signature or malformed payload — never trust it.
    return Response.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  if (event.event === "room_finished" && event.room?.name) {
    try {
      await endShowByRoomName(event.room.name);
    } catch {
      // Best-effort. Returning 200 stops LiveKit retrying a request we've
      // accepted; the stale-show cron is the backstop if the end failed.
    }
  }

  return Response.json({ ok: true });
}
