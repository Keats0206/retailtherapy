import { notFound, redirect } from "next/navigation";

import { createAccessToken, getLiveKitConfig } from "@/lib/livekit";
import { getShowByRoomName } from "@/lib/shows";

import Player from "./player";

// Legacy route: the [playbackId] segment is a LiveKit room name. Redirect to
// the canonical show page when we can resolve it.
export default async function WatchPage({
  params,
}: PageProps<"/watch/[playbackId]">) {
  const { playbackId: room } = await params;
  const show = await getShowByRoomName(room);
  if (show) redirect(`/s/${show.slug}`);

  // Fall back for direct room access that predates the show lifecycle.
  if (!room) notFound();

  let liveConnection: { token: string; url: string } | null = null;
  try {
    const identity = `viewer-${crypto.randomUUID().slice(0, 8)}`;
    const token = await createAccessToken({
      room,
      identity,
      name: "Viewer",
      canPublish: false,
    });
    const { url } = getLiveKitConfig();
    liveConnection = { token, url };
  } catch {
    // Client falls back to POST /api/livekit/token if minting fails.
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Player room={room} liveConnection={liveConnection} />
    </main>
  );
}
