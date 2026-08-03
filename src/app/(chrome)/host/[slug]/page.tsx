import { notFound } from "next/navigation";

import { getSignedInUser } from "@/lib/auth";
import { getHostFeedback } from "@/lib/host-feedback";
import { buildEndedRecap } from "@/lib/show-recap";
import { getRecordingStatus } from "@/lib/show-public";
import { getShowBySlug, resolveRecording, snapshotOf } from "@/lib/shows";

import HostClient from "../host-client";
import HostRecapClient from "./host-recap-client";

export default async function HostShowPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getSignedInUser();
  if (!user) return null;

  const { slug } = await params;
  let show = await getShowBySlug(slug);
  if (!show || show.hostUserId !== user.id) notFound();

  if (show.status === "live") {
    const hostName =
      user.username ??
      [user.firstName, user.lastName].filter(Boolean).join(" ") ??
      null;

    return (
      <HostClient
        hostName={hostName}
        showSlug={slug}
        resumeSlug={slug}
        liveShowTitle={show.title}
      />
    );
  }

  if (show.status !== "ended") notFound();

  show = await resolveRecording(show);
  const snapshot = snapshotOf(show);
  const feedback = await getHostFeedback(slug, user.id);

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
    muxDurationSeconds: show.muxDurationSeconds,
    recordingStatus: getRecordingStatus(show),
  });

  return (
    <HostRecapClient
      initialRecap={recap}
      initialRating={feedback?.rating ?? null}
    />
  );
}
