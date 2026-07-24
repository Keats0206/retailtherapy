import { getHostUser } from "@/lib/auth";
import { createAccessToken, getLiveKitConfig } from "@/lib/livekit";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { createShow, listLiveShows } from "@/lib/shows";

// GET /api/shows?status=live — public list of live shows for discovery.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  if (status !== "live") {
    return Response.json(
      { error: "Only status=live is supported" },
      { status: 400 },
    );
  }

  try {
    const shows = await listLiveShows();
    return Response.json({ shows });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list shows";
    return Response.json({ error: message }, { status: 500 });
  }
}

// POST /api/shows — open a live show.
//
// Does everything the host needs to be live and shareable in one round trip:
// creates the row, provisions the Mux live stream that will archive it, and
// mints the host's LiveKit token. The recording itself starts separately, once
// the host's browser reports it has connected (see ./[slug]/recording).
export async function POST(request: Request) {
  const host = await getHostUser();
  if (!host) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = clientIp(request);
  const limit = checkRateLimit(`create-show:${host.id}:${ip}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return rateLimitResponse(limit.retryAfterSec ?? 60);
  }

  let body: { title?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const title = body.title?.trim() || "Untitled show";

  try {
    const show = await createShow({
      hostUserId: host.id,
      hostName:
        host.username ??
        [host.firstName, host.lastName].filter(Boolean).join(" ") ??
        null,
      title,
    });

    const token = await createAccessToken({
      room: show.roomName,
      identity: host.id,
      name: show.hostName ?? "Host",
      canPublish: true,
    });
    const { url } = getLiveKitConfig();

    return Response.json(
      {
        slug: show.slug,
        title: show.title,
        room: show.roomName,
        token,
        url,
      },
      { status: 201 },
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to start the show";
    const status = message.includes("already have a live show") ? 409 : 500;
    return Response.json({ error: message }, { status });
  }
}
