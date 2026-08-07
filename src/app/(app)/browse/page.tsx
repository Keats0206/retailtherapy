import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { BrowsePage } from "@/components/browse-page";
import { isAdmin, isHostingApproved } from "@/lib/auth";
import { listEndedShows, listLiveShows, listScheduledShows } from "@/lib/shows";

export const metadata: Metadata = {
  title: "Browse · frontrow",
  description: "Live now, upcoming shows, and every recap.",
};

export default async function BrowseRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();

  const [liveShows, upcomingShows, pastShows, admin, canHost] = await Promise.all([
    listLiveShows(),
    listScheduledShows(),
    listEndedShows(),
    isAdmin(),
    user ? isHostingApproved(user) : Promise.resolve(false),
  ]);

  return (
    <BrowsePage
      liveShows={liveShows}
      upcomingShows={upcomingShows}
      pastShows={pastShows}
      isAdmin={admin}
      canHost={canHost}
    />
  );
}
