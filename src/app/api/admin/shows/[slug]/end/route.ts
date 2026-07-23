import { getAdminUser } from "@/lib/auth";
import { endShow, getShowBySlug, snapshotOf } from "@/lib/shows";

// POST /api/admin/shows/<slug>/end — force-end any live show (admin only).
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/admin/shows/[slug]/end">,
) {
  const admin = await getAdminUser();
  if (!admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show) {
    return Response.json({ error: "Show not found" }, { status: 404 });
  }

  try {
    const ended = await endShow(slug, show.hostUserId, snapshotOf(show));
    if (!ended) {
      return Response.json(
        { error: "Show not found or already ended" },
        { status: 404 },
      );
    }
    if (ended.status !== "ended") {
      return Response.json(
        { error: "Failed to end the show" },
        { status: 500 },
      );
    }
    return Response.json({ slug: ended.slug, status: ended.status });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to end the show";
    return Response.json({ error: message }, { status: 500 });
  }
}
