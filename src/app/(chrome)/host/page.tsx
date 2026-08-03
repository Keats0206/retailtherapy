import { redirect } from "next/navigation";

import { getSignedInUser } from "@/lib/auth";
import { LOCAL_STREAM } from "@/lib/live/mode";
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

  const { slug: resumeSlug, challenge: challengeSlug } = await searchParams;

  if (challengeSlug) {
    redirect(`/host/setup?challenge=${challengeSlug}`);
  }

  if (resumeSlug) {
    redirect(hostShowPath(resumeSlug));
  }

  let liveShow = await getLiveShowForHost(user.id);
  if (LOCAL_STREAM) {
    await endDesignModeOrphansForHost(user.id);
    liveShow = await getLiveShowForHost(user.id);
  }

  if (liveShow) {
    redirect(hostShowPath(liveShow.slug));
  }

  redirect("/host/setup");
}
