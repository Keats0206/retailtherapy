import { getViewerChatName, getSignedInUser } from "@/lib/auth";
import { createAccessToken, getLiveKitConfig } from "@/lib/livekit";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";

// POST /api/livekit/token — mint a subscribe-only LiveKit token for viewers.
// Body: { room: string }.
//
// Host publish tokens are only issued from POST /api/shows and
// POST /api/shows/<slug>/resume after ownership checks — never here.
//
// Signed-in viewers get a stable identity and Clerk-derived display name.
// Anonymous viewers may watch and vote; chat is gated client-side.
export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = checkRateLimit(`livekit-token:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return rateLimitResponse(limit.retryAfterSec ?? 60);
  }

  let body: { room?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.role === "host") {
    return Response.json(
      { error: "Host tokens must be requested via /api/shows" },
      { status: 403 },
    );
  }

  const room = body.room?.trim();
  if (!room) {
    return Response.json({ error: "Missing room" }, { status: 400 });
  }

  const user = await getSignedInUser();
  const identity = user
    ? `viewer-${user.id}`
    : `viewer-${crypto.randomUUID().slice(0, 8)}`;
  const displayName = user ? getViewerChatName(user) : "Guest";
  const canChat = user !== null;

  try {
    const token = await createAccessToken({
      room,
      identity,
      name: displayName,
      canPublish: false,
    });
    const { url } = getLiveKitConfig();
    return Response.json({
      token,
      url,
      room,
      identity,
      canPublish: false,
      canPublishData: true,
      canChat,
      displayName,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mint access token";
    return Response.json({ error: message }, { status: 500 });
  }
}
