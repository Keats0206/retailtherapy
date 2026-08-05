import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { BrowsePage } from "@/components/browse-page";
import { isAdmin } from "@/lib/auth";
import { listChallenges } from "@/lib/challenges";
import { listEndedShows, listLiveShows, listScheduledShows, listShowsForHost } from "@/lib/shows";

export const metadata: Metadata = {
  title: "Home · frontrow",
  description:
    "Live and upcoming shows, brand challenges, your host dashboard, and every recap.",
};

export default async function AppHomePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [challenges, liveShows, upcomingShows, pastShows, admin, hostShows] =
    await Promise.all([
      listChallenges(),
      listLiveShows(),
      listScheduledShows(),
      listEndedShows(),
      isAdmin(),
      listShowsForHost(userId),
    ]);

  return (
    <BrowsePage
      challenges={challenges}
      liveShows={liveShows}
      upcomingShows={upcomingShows}
      pastShows={pastShows}
      isAdmin={admin}
      hostShows={hostShows.map((show) => ({
        id: show.id,
        slug: show.slug,
        title: show.title,
        status: show.status,
        startedAt: show.startedAt?.toISOString() ?? null,
      }))}
    />
  );
}
