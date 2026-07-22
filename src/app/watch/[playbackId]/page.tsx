import { notFound, redirect } from "next/navigation";

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

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <Player room={room} />
    </main>
  );
}
