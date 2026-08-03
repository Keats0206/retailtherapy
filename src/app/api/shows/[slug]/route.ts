import { getHostUser } from "@/lib/auth";
import {
  deleteShow,
  getShowBySlug,
  resolveRecording,
} from "@/lib/shows";
import { toPublicShow, getRecordingStatus } from "@/lib/show-public";

// DELETE /api/shows/<slug> — remove a finished show. Host-only.
export async function DELETE(
  _request: Request,
  { params }: RouteContext<"/api/shows/[slug]">,
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

  if (show.status === "live") {
    return Response.json(
      { error: "End the show before deleting it" },
      { status: 409 },
    );
  }

  try {
    const deleted = await deleteShow(slug, host.id);
    if (!deleted) {
      return Response.json({ error: "Show not found" }, { status: 404 });
    }
    return Response.json({ slug: deleted.slug });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to delete the show";
    return Response.json({ error: message }, { status: 500 });
  }
}

// GET /api/shows/<slug> — public show status for viewers and polling.
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/shows/[slug]">,
) {
  const { slug } = await params;

  let show = await getShowBySlug(slug);
  if (!show) {
    return Response.json({ error: "Show not found" }, { status: 404 });
  }

  if (show.status === "ended") {
    show = await resolveRecording(show);
  }

  const cacheControl =
    show.status === "live"
      ? "private, max-age=2"
      : show.muxPlaybackId || getRecordingStatus(show) !== "processing"
        ? "private, max-age=60"
        : "private, max-age=5";

  return Response.json(toPublicShow(show), {
    headers: { "Cache-Control": cacheControl },
  });
}
