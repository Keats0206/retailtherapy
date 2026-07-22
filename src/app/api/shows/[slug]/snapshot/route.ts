import { getHostUser } from "@/lib/auth";
import { saveSnapshot } from "@/lib/shows";
import type { StreamSnapshot } from "@/lib/stream-store";

// PUT /api/shows/<slug>/snapshot — checkpoint the shopping state mid-show.
//
// The host is authoritative over the trail and tallies, so the host's browser
// is the only thing that can report them. Called on a debounce as the state
// changes: if the host's tab dies without ever reaching "End show", the recap
// is still there, only slightly stale.
export async function PUT(
  request: Request,
  { params }: RouteContext<"/api/shows/[slug]/snapshot">,
) {
  const host = await getHostUser();
  if (!host) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  let body: { snapshot?: StreamSnapshot };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.snapshot) {
    return Response.json({ error: "Missing snapshot" }, { status: 400 });
  }

  try {
    await saveSnapshot(slug, host.id, body.snapshot);
    return Response.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save snapshot";
    return Response.json({ error: message }, { status: 500 });
  }
}
