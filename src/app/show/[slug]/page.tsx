import { notFound } from "next/navigation";

import { buildEndedRecap } from "@/lib/show-recap";
import { getRecordingStatus, toPublicShow } from "@/lib/show-public";
import { getShowBySlug, resolveRecording, snapshotOf } from "@/lib/shows";

import ShowPageClient from "./show-page-client";
import ViewerRecapClient from "./viewer-recap-client";

export default async function ShowPage({
  params,
}: PageProps<"/show/[slug]">) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show) notFound();

  if (show.status === "ended") {
    const resolved = await resolveRecording(show);
    const snapshot = snapshotOf(resolved);
    const recap = buildEndedRecap({
      slug: resolved.slug,
      title: resolved.title,
      host: resolved.hostName ?? "Host",
      snapshot,
      startedAt: resolved.startedAt ? resolved.startedAt.getTime() : null,
      endedAt: resolved.endedAt ? resolved.endedAt.getTime() : undefined,
      peakViewers: snapshot.stats?.peakViewers ?? 0,
      chatCount: snapshot.stats?.chatCount ?? 0,
      muxPlaybackId: resolved.muxPlaybackId,
      muxDurationSeconds: resolved.muxDurationSeconds,
      recordingStatus: getRecordingStatus(resolved),
    });
    return <ViewerRecapClient initialRecap={recap} />;
  }

  return <ShowPageClient initialShow={toPublicShow(show)} />;
}
