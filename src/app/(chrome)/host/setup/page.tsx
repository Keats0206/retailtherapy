import { getSignedInUser } from "@/lib/auth";
import { getChallengeBySlug } from "@/lib/challenges";
import { getLiveShowForHost } from "@/lib/shows";
import { redirect } from "next/navigation";

import HostSetupClient from "./setup-client";

export const metadata = {
  title: "Set up your show — frontrow",
};

/**
 * Creator onboarding before go-live. Collects shopping intent, items, show
 * name, and socials, then hands off to /host for camera check + Go live.
 * Answers are persisted on the stream row when the show is created.
 *
 * `?challenge=<slug>` arrives from a challenge card. The event is resolved
 * here rather than trusted from the query string, so the brief shown to the
 * host is the real one and a bad slug simply falls through to a normal setup.
 */
export default async function HostSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string }>;
}) {
  const user = await getSignedInUser();
  if (!user) return null;

  const [liveShow, { challenge: challengeSlug }] = await Promise.all([
    getLiveShowForHost(user.id),
    searchParams,
  ]);
  if (liveShow) {
    redirect(`/host?slug=${liveShow.slug}`);
  }

  const challenge = challengeSlug
    ? await getChallengeBySlug(challengeSlug)
    : null;

  return (
    <HostSetupClient
      challenge={
        challenge && challenge.state !== "closed"
          ? {
              slug: challenge.slug,
              title: challenge.title,
              prompt: challenge.prompt,
              brandName: challenge.brandName,
              // Already falls back to the brand domain in `toChallengeCard`.
              storeUrl: challenge.storeUrl,
              emoji: challenge.emoji,
              budget: challenge.budget,
              currency: challenge.currency,
              durationSeconds: challenge.durationSeconds,
            }
          : null
      }
    />
  );
}
