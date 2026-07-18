import Player from "./player";

// The [playbackId] URL segment is the LiveKit room name (see /host, which links
// to /watch/stream-<hostId>). Kept the folder name to avoid a route rename.
export default async function WatchPage({
  params,
}: PageProps<"/watch/[playbackId]">) {
  const { playbackId: room } = await params;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Live now
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          If the host hasn&rsquo;t started yet, the player will connect
          automatically once they go live.
        </p>
      </header>

      <Player room={room} />
    </main>
  );
}
