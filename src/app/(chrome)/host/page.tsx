import { redirect } from "next/navigation";

import { getSignedInUser, isHostingApproved } from "@/lib/auth";
import { LOCAL_STREAM } from "@/lib/live/mode";
import { hasOnboarded } from "@/lib/onboarding";
import {
  endDesignModeOrphansForHost,
  getLiveShowForHost,
} from "@/lib/shows";
import { hostShowPath } from "@/lib/show-urls";

// Server gate: proxy.ts requires a signed-in user to reach /host.
export default async function HostPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; challenge?: string }>;
}) {
  const user = await getSignedInUser();
  if (!user) return null;
  // Outside the (app) group, so the first-run gate has to be repeated here.
  if (!hasOnboarded(user)) redirect("/welcome");

  const { slug: resumeSlug, challenge: challengeSlug } = await searchParams;

  let liveShow = await getLiveShowForHost(user.id);
  if (LOCAL_STREAM) {
    await endDesignModeOrphansForHost(user.id);
    liveShow = await getLiveShowForHost(user.id);
  }

  if (liveShow) {
    redirect(hostShowPath(liveShow.slug));
  }

  const approved = await isHostingApproved(user);
  if (!approved) {
    redirect("/creators");
  }

  if (challengeSlug) {
    redirect(`/host/setup?challenge=${challengeSlug}`);
  }

  if (resumeSlug) {
    redirect(hostShowPath(resumeSlug));
  }

  redirect("/host/setup");
}
