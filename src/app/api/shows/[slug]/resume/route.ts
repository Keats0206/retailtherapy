import { getHostUser } from "@/lib/auth";
import { createAccessToken, getLiveKitConfig } from "@/lib/livekit";
import { getShowBySlug, snapshotOf } from "@/lib/shows";

// POST /api/shows/<slug>/resume — reconnect a host to an in-progress live show.
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/shows/[slug]/resume">,
) {
  const host = await getHostUser();
  if (!host) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show || show.hostUserId !== host.id) {
    return Response.json({ error: "Show not found" }, { status: 404 });
  }
  if (show.status !== "live") {
    return Response.json({ error: "Show is not live" }, { status: 409 });
  }

  try {
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
      snapshot: snapshotOf(show),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to resume the show";
    return Response.json({ error: message }, { status: 500 });
  }
}
