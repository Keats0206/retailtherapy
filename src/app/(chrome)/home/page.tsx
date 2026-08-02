import type { Metadata } from "next";
import { currentUser } from "@clerk/nextjs/server";

import { saveProfileAction } from "@/app/(chrome)/profile/actions";
import { BrowsePage } from "@/components/browse-page";
import { ProfileSetup } from "@/components/profile-setup";
import { isAdmin } from "@/lib/auth";
import { getProfileForUser } from "@/lib/profile";
import { listEndedShows, listLiveShows, listShowsForHost } from "@/lib/shows";

export const metadata: Metadata = {
  title: "Home — frontrow",
  description:
    "Live shopping shows happening now. Join the room, vote on what you'd buy, and shop along while hosts show what they're buying.",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const [user, { view }] = await Promise.all([currentUser(), searchParams]);

  // A fresh signup has no profile row yet, so their first landing here is
  // profile setup instead of the browse grid. ?view=browse is the escape
  // hatch — it's where the form's own "Browse shows" CTA points.
  if (user && view !== "browse") {
    const profile = await getProfileForUser(user.id);
    if (!profile) {
      return (
        <ProfileSetup
          action={saveProfileAction}
          initialName={user.fullName ?? user.firstName ?? ""}
        />
      );
    }
  }

  const [liveShows, pastShows, admin, hostShows] = await Promise.all([
    listLiveShows(),
    listEndedShows(),
    isAdmin(),
    user ? listShowsForHost(user.id) : Promise.resolve([]),
  ]);

  return (
    <BrowsePage
      embedded
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
