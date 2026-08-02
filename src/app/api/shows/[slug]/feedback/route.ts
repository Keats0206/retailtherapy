import { getHostUser } from "@/lib/auth";
import { isValidRating, saveHostFeedback } from "@/lib/host-feedback";

// POST /api/shows/<slug>/feedback — how the show felt from the host's side.
//
// Asked on the recap page right after the show ends, while the experience is
// still fresh and the host is already sitting on the page waiting for the
// recording to finish packaging.
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/shows/[slug]/feedback">,
) {
  const host = await getHostUser();
  if (!host) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { rating?: unknown; note?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isValidRating(body.rating)) {
    return Response.json(
      { error: "Rating must be a whole number from 1 to 5" },
      { status: 400 },
    );
  }

  const { slug } = await params;

  try {
    const saved = await saveHostFeedback(slug, host.id, {
      rating: body.rating,
      note: typeof body.note === "string" ? body.note : null,
    });
    if (!saved) {
      return Response.json({ error: "Show not found" }, { status: 404 });
    }
    return Response.json({ ok: true, ...saved });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save feedback";
    return Response.json({ error: message }, { status: 500 });
  }
}
