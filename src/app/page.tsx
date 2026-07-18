import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-24">
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Retail Therapy
          </h1>
          <p className="max-w-md text-lg text-zinc-600 dark:text-zinc-400">
            Livestream shopping powered by Mux. Start a broadcast as a host, or
            open a viewer link to watch a stream live.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/host"
            className="flex h-12 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Go live as host →
          </Link>
        </div>
      </main>
    </div>
  );
}
