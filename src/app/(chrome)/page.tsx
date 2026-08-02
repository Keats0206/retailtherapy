import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { BrowsePage } from "@/components/browse-page";
import { isAdmin } from "@/lib/auth";
import { listChallenges } from "@/lib/challenges";
import { listEndedShows, listLiveShows, listShowsForHost } from "@/lib/shows";

export const metadata: Metadata = {
  title: "frontrow — watch people shop",
  description:
    "Brand challenges, shows happening now, and recaps from every host. Join a room, vote on the picks, and shop along.",
};

/**
 * The home page *is* the browse experience — there is no marketing landing
 * page in front of it. Signed-out visitors see the same shows and challenges
 * as members; only the calls to action change.
 */
export default async function HomePage() {
  const { userId } = await auth();
  const [challenges, liveShows, pastShows, admin, hostShows] = await Promise.all([
    listChallenges(),
    listLiveShows(),
    listEndedShows(),
    isAdmin(),
    userId ? listShowsForHost(userId) : Promise.resolve([]),
  ]);

  return (
    <BrowsePage
      challenges={challenges}
      liveShows={liveShows}
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
