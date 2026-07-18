import Link from "next/link";

import { getHostUser } from "@/lib/auth";
import HostClient from "./host-client";

// Server gate: proxy.ts already requires a signed-in user to reach /host; here
// we further restrict hosting to the email allowlist (HOST_ALLOWLIST).
export default async function HostPage() {
  const host = await getHostUser();

  if (!host) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Not authorized
        </h1>
        <p className="max-w-md text-zinc-600 dark:text-zinc-400">
          Your account isn&rsquo;t allowed to host live streams. If this is a
          mistake, contact the app owner.
        </p>
        <Link
          href="/"
          className="rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
        >
          ← Back home
        </Link>
      </main>
    );
  }

  // One stable LiveKit room per host. Viewers watch at /watch/<room>.
  const room = `stream-${host.id}`;

  return <HostClient room={room} />;
}
