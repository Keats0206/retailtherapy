import { getHostUser } from "@/lib/auth";
import { createAccessToken, getLiveKitConfig } from "@/lib/livekit";
import {
  checkRateLimit,
  clientIp,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { cancelShowReminders } from "@/lib/show-reminders";
import { getShowBySlug, startScheduledShow } from "@/lib/shows";

// POST /api/shows/<slug>/start — go live from a scheduled show.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const host = await getHostUser();
  if (!host) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip = clientIp(_request);
  const limit = checkRateLimit(`start-show:${host.id}:${ip}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!limit.ok) {
    return rateLimitResponse(limit.retryAfterSec ?? 60);
  }

  const { slug } = await params;

  try {
    const show = await startScheduledShow(slug, host.id);
    await cancelShowReminders(show.id);

    const token = await createAccessToken({
      room: show.roomName,
      identity: host.id,
      name: show.hostName ?? "Host",
      canPublish: true,
    });
    const { url } = getLiveKitConfig();

    return Response.json({
      slug: show.slug,
      title: show.title,
      room: show.roomName,
      token,
      url,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to start the show";
    const status = message.includes("already have a live show") ? 409 : 400;
    return Response.json({ error: message }, { status });
  }
}
