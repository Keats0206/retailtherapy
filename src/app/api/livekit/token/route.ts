import { currentUser } from "@clerk/nextjs/server";

import { createAccessToken, getLiveKitConfig } from "@/lib/livekit";

// POST /api/livekit/token — mint a LiveKit access token for a room.
// Body: { room: string, role?: "host" | "viewer" }.
// Signed-in users may publish when role is "host"; everyone else is subscribe-only.
// Viewers do not need to be signed in.
export async function POST(request: Request) {
  let body: { room?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const room = body.room?.trim();
  if (!room) {
    return Response.json({ error: "Missing room" }, { status: 400 });
  }

  // Clerk may be unconfigured (e.g. keys not yet set); treat that as anonymous
  // so viewers still work. Publishing requires a signed-in user.
  let user: Awaited<ReturnType<typeof currentUser>> = null;
  try {
    user = await currentUser();
  } catch {
    user = null;
  }

  const wantsHost = body.role === "host";

  if (wantsHost && !user) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const canPublish = wantsHost && !!user;
  const identity =
    user?.id ?? `viewer-${crypto.randomUUID().slice(0, 8)}`;
  const name =
    user?.username ??
    user?.firstName ??
    (canPublish ? "Host" : "Viewer");

  try {
    const token = await createAccessToken({
      room,
      identity,
      name: name ?? undefined,
      canPublish,
    });
    const { url } = getLiveKitConfig();
    return Response.json({ token, url, room, identity, canPublish });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to mint access token";
    return Response.json({ error: message }, { status: 500 });
  }
}
