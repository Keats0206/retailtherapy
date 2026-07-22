import { getShowBySlug, resolveRecording } from "@/lib/shows";
import { toPublicShow } from "@/lib/show-public";

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

  return Response.json(toPublicShow(show));
}
