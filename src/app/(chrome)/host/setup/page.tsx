import Link from "next/link";

import { getSignedInUser, isUserAllowlistedToHost } from "@/lib/auth";
import { getLiveShowForHost } from "@/lib/shows";
import { Button } from "@/components/ui/button";
import { redirect } from "next/navigation";

import HostSetupClient from "./setup-client";

export const metadata = {
  title: "Set up your show — frontrow",
};

/**
 * Creator onboarding before go-live. Collects shopping intent, items, show
 * name, and socials, then hands off to /host for camera check + Go live.
 * Answers are persisted on the stream row when the show is created.
 */
export default async function HostSetupPage() {
  const user = await getSignedInUser();
  if (!user) return null;

  if (!isUserAllowlistedToHost(user)) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-24">
        <h1 className="text-2xl font-normal tracking-tight">
          Hosting is invite-only
        </h1>
        <p className="text-sm text-muted-foreground">
          Your account is signed in, but it is not on the host allowlist yet.
          Join the waitlist — we send invites as spots open up.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="micro"
            className="bg-live text-live-foreground hover:bg-live/90"
            render={<Link href="/apply" />}
          >
            Apply to host
          </Button>
          <Button
            variant="outline"
            size="micro"
            className="w-fit"
            render={<Link href="/home" />}
          >
            Back to home
          </Button>
        </div>
      </main>
    );
  }

  const liveShow = await getLiveShowForHost(user.id);
  if (liveShow) {
    redirect(`/host?slug=${liveShow.slug}`);
  }

  return <HostSetupClient />;
}
