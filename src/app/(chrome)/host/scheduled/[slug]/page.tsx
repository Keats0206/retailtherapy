import { notFound } from "next/navigation";

import { getSignedInUser } from "@/lib/auth";
import { getShowBySlug } from "@/lib/shows";

import ScheduledShareClient from "./scheduled-share-client";

export const metadata = {
  title: "Show scheduled — frontrow",
};

export default async function HostScheduledPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getSignedInUser();
  if (!user) return null;

  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (
    !show ||
    show.hostUserId !== user.id ||
    show.status !== "scheduled" ||
    !show.scheduledFor
  ) {
    notFound();
  }

  return (
    <ScheduledShareClient
      slug={show.slug}
      title={show.title}
      scheduledFor={show.scheduledFor.toISOString()}
    />
  );
}
