import { getHostUser } from "@/lib/auth";
import { startRecording } from "@/lib/shows";

// POST /api/shows/<slug>/recording — begin mirroring the room to Mux.
//
// Separate from show creation because a RoomComposite egress needs the room to
// exist, and a LiveKit room only exists once someone is in it. The host client
// calls this from `onConnected`.
export async function POST(
  _request: Request,
  { params }: RouteContext<"/api/shows/[slug]/recording">,
) {
  const host = await getHostUser();
  if (!host) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { slug } = await params;

  try {
    const show = await startRecording(slug, host.id);
    if (!show) {
      return Response.json({ error: "Show not found" }, { status: 404 });
    }
    return Response.json({ recording: show.egressId !== null });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to start recording";
    // The show is live and watchable either way — the host should be told the
    // recording failed, not thrown out of their own broadcast.
    return Response.json({ error: message }, { status: 500 });
  }
}
