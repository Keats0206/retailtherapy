import { getHostUser } from "@/lib/auth";
import { saveSnapshot } from "@/lib/shows";
import {
  snapshotTooLarge,
  validateSnapshot,
} from "@/lib/snapshot-validation";

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
  const raw = await request.text();
  if (snapshotTooLarge(raw)) {
    return Response.json({ error: "Snapshot too large" }, { status: 413 });
  }

  let body: { snapshot?: unknown };
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.snapshot || !validateSnapshot(body.snapshot)) {
    return Response.json({ error: "Invalid snapshot" }, { status: 400 });
  }

  try {
    const saved = await saveSnapshot(slug, host.id, body.snapshot);
    if (!saved) {
      return Response.json({ error: "Show not found or not live" }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save snapshot";
    return Response.json({ error: message }, { status: 500 });
  }
}
