import { notFound, redirect } from "next/navigation";

import { getSignedInUser, isUserAllowlistedToHost } from "@/lib/auth";
import { buildEndedRecap } from "@/lib/show-recap";
import { getShowBySlug, resolveRecording, snapshotOf } from "@/lib/shows";

import HostRecapClient from "./host-recap-client";

export default async function HostRecapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getSignedInUser();
  if (!user) return null;

  if (!isUserAllowlistedToHost(user)) {
    redirect("/host");
  }

  const { slug } = await params;
  let show = await getShowBySlug(slug);
  if (!show || show.hostUserId !== user.id) notFound();

  if (show.status === "live") {
    redirect("/host");
  }

  if (show.status !== "ended") notFound();

  show = await resolveRecording(show);
  const snapshot = snapshotOf(show);

  const recap = buildEndedRecap({
    slug: show.slug,
    title: show.title,
    host: show.hostName ?? "Host",
    snapshot,
    startedAt: show.startedAt ? show.startedAt.getTime() : null,
    endedAt: show.endedAt ? show.endedAt.getTime() : undefined,
    peakViewers: snapshot.stats?.peakViewers ?? 0,
    chatCount: snapshot.stats?.chatCount ?? 0,
    muxPlaybackId: show.muxPlaybackId,
  });

  return <HostRecapClient initialRecap={recap} />;
}
