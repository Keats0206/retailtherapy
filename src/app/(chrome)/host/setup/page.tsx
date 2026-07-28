import { getSignedInUser } from "@/lib/auth";
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
 */
export default async function HostSetupPage() {
  const user = await getSignedInUser();
  if (!user) return null;

  const liveShow = await getLiveShowForHost(user.id);
  if (liveShow) {
    redirect(`/host?slug=${liveShow.slug}`);
  }

  return <HostSetupClient />;
}
