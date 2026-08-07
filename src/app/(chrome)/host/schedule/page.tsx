import { getSignedInUser, isHostingApproved } from "@/lib/auth";
import { getChallengeBySlug } from "@/lib/challenges";
import { LOCAL_STREAM } from "@/lib/live/mode";
import {
  endDesignModeOrphansForHost,
  getLiveShowForHost,
} from "@/lib/shows";
import { hostShowPath } from "@/lib/show-urls";
import { redirect } from "next/navigation";

import HostScheduleClient from "./schedule-client";

export const metadata = {
  title: "Schedule your show — frontrow",
};

/**
 * Creator setup for a scheduled show. Same intent/items flow as go-live setup,
 * but picks a future datetime and lands on a share-link confirmation page.
 */
export default async function HostSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string }>;
}) {
  const user = await getSignedInUser();
  if (!user) return null;

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
    <HostScheduleClient
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
