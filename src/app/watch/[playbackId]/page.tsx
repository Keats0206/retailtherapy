import Player from "./player";

export default async function WatchPage({
  params,
}: PageProps<"/watch/[playbackId]">) {
  const { playbackId } = await params;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Live now
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          If the host hasn&rsquo;t started broadcasting yet, the player will
          connect automatically once the stream goes live.
        </p>
      </header>

      <Player playbackId={playbackId} />
    </main>
  );
}
