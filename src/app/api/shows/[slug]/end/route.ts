import { getHostUser } from "@/lib/auth";
import { endShow } from "@/lib/shows";
import type { StreamSnapshot } from "@/lib/stream-store";

// POST /api/shows/<slug>/end — close the show and save the recording.
//
// Irreversible, and the UI asks twice before calling it. Stops the egress, tells
// Mux to package the asset, and freezes the final trail and tallies. The asset
// itself lands a little later; /show/<slug> handles the gap.
export async function POST(
  request: Request,
  { params }: RouteContext<"/api/shows/[slug]/end">,
) {
  const host = await getHostUser();
  if (!host) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  // A final snapshot is welcome but not required — `endShow` falls back to the
  // last checkpoint rather than refusing to end the show.
  let snapshot: StreamSnapshot | null = null;
  try {
    const body = (await request.json()) as { snapshot?: StreamSnapshot };
    snapshot = body.snapshot ?? null;
  } catch {
    snapshot = null;
  }

  try {
    const show = await endShow(slug, host.id, snapshot);
    if (!show) {
      return Response.json(
        { error: "Show not found or already ended" },
        { status: 404 },
      );
    }
    if (show.status !== "ended") {
      return Response.json(
        { error: "Failed to end the show" },
        { status: 500 },
      );
    }
    return Response.json({ slug: show.slug, status: show.status });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to end the show";
    return Response.json({ error: message }, { status: 500 });
  }
}
