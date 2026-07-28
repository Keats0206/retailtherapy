import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";

import { BrowsePage } from "@/components/browse-page";
import { isAdmin } from "@/lib/auth";
import { listEndedShows, listLiveShows, listShowsForHost } from "@/lib/shows";

export const metadata: Metadata = {
  title: "Browse live shows — frontrow",
  description:
    "Live shopping shows happening now. Join the room, vote on what you'd buy, and shop along while hosts show what they're buying.",
};

export default async function BrowseRoute() {
  const { userId } = await auth();
  const [liveShows, pastShows, admin, hostShows] = await Promise.all([
    listLiveShows(),
    listEndedShows(),
    isAdmin(),
    userId ? listShowsForHost(userId) : Promise.resolve([]),
  ]);

  return (
    <BrowsePage
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
