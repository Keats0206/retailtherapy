import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { YourShowsPage } from "@/components/your-shows-page";
import { isHostingApproved } from "@/lib/auth";
import { listShowsForHost } from "@/lib/shows";

export const metadata: Metadata = {
  title: "Your shows · frontrow",
  description: "Every show you've hosted — live, scheduled, and past.",
};

export default async function YourShowsRoute() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await currentUser();
  const [hostShows, canHost] = await Promise.all([
    listShowsForHost(userId),
    user ? isHostingApproved(user) : Promise.resolve(false),
  ]);

  return (
    <YourShowsPage
      canHost={canHost}
      hostShows={hostShows.map((show) => ({
        id: show.id,
        slug: show.slug,
        title: show.title,
        status: show.status,
        startedAt: show.startedAt?.toISOString() ?? null,
        scheduledFor: show.scheduledFor?.toISOString() ?? null,
      }))}
    />
  );
}
