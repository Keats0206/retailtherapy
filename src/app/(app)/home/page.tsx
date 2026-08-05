import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { saveProfileAction } from "@/app/(chrome)/profile/actions";
import { BrowsePage } from "@/components/browse-page";
import { ProfileSetup } from "@/components/profile-setup";
import { isAdmin } from "@/lib/auth";
import { listChallenges } from "@/lib/challenges";
import { getProfileForUser } from "@/lib/profile";
import { listEndedShows, listLiveShows, listShowsForHost } from "@/lib/shows";

export const metadata: Metadata = {
  title: "Home · frontrow",
  description:
    "Live shows, brand challenges, your host dashboard, and every recap.",
};

export default async function AppHomePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const [{ view }, user] = await Promise.all([searchParams, currentUser()]);

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

  const [challenges, liveShows, pastShows, admin, hostShows] =
    await Promise.all([
      listChallenges(),
      listLiveShows(),
      listEndedShows(),
      isAdmin(),
      listShowsForHost(userId),
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
