import { redirect } from "next/navigation";

import { getSignedInUser, isHostingApproved } from "@/lib/auth";
import { getChallengeBySlug } from "@/lib/challenges";
import { LOCAL_STREAM } from "@/lib/live/mode";
import { hasOnboarded } from "@/lib/onboarding";
import {
  endDesignModeOrphansForHost,
  getLiveShowForHost,
} from "@/lib/shows";
import { hostShowPath } from "@/lib/show-urls";

import HostSetupClient from "./setup-client";

export const metadata = {
  title: "Set up your show — frontrow",
};

/**
 * Creator setup before go-live. Collects shopping intent and show name, then
 * starts the show and hands off to /host/<slug> for the live studio.
 */
export default async function HostSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string }>;
}) {
  const user = await getSignedInUser();
  if (!user) return null;
  // Outside the (app) group, so the first-run gate has to be repeated here.
  if (!hasOnboarded(user)) redirect("/welcome");

  const [liveShow, approved, { challenge: challengeSlug }] = await Promise.all([
    getLiveShowForHost(user.id),
    isHostingApproved(user),
    searchParams,
  ]);
  if (LOCAL_STREAM) {
    await endDesignModeOrphansForHost(user.id);
  } else if (liveShow) {
    redirect(hostShowPath(liveShow.slug));
  } else if (!approved) {
    redirect("/creators");
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
