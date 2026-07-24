import Link from "next/link";

import { getSignedInUser, isUserAllowlistedToHost } from "@/lib/auth";
import { isChannel3Configured } from "@/lib/channel3";
import { getLiveShowForHost } from "@/lib/shows";
import { Button } from "@/components/ui/button";
import HostClient from "./host-client";

// Server gate: proxy.ts requires a signed-in user to reach /host.
export default async function HostPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const user = await getSignedInUser();
  if (!user) return null;

  const { slug: resumeSlug } = await searchParams;

  if (!isUserAllowlistedToHost(user)) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-24">
        <h1 className="text-2xl font-normal tracking-tight">Hosting is invite-only</h1>
        <p className="text-sm text-muted-foreground">
          Your account is signed in, but it is not on the host allowlist yet.
          Join the waitlist — we send invites as spots open up.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="micro" className="bg-live text-live-foreground hover:bg-live/90" render={<Link href="/apply" />}>
            Join the waitlist
          </Button>
          <Button variant="outline" size="micro" className="w-fit" render={<Link href="/dashboard" />}>
            Back to dashboard
          </Button>
        </div>
      </main>
    );
  }

  const hostName =
    user.username ??
    [user.firstName, user.lastName].filter(Boolean).join(" ") ??
    null;

  const liveShow = await getLiveShowForHost(user.id);

  return (
    <HostClient
      hostName={hostName}
      channel3Configured={isChannel3Configured()}
      resumeSlug={resumeSlug ?? null}
      liveShowSlug={liveShow?.slug ?? null}
      liveShowTitle={liveShow?.title ?? null}
    />
  );
}
