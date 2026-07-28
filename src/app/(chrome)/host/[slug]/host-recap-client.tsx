"use client";

import { useCallback, useState } from "react";

import { ShowEndedCreator } from "@/components/show-ended-creator";
import { useVisiblePoll } from "@/hooks/use-visible-poll";
import { readResponseJson } from "@/lib/fetch-json";
import type { PublicShow } from "@/lib/show-public";
import { buildEndedRecap, type EndedShowRecap } from "@/lib/show-recap";

const POLL_MS = 10_000;

export default function HostRecapClient({
  initialRecap,
}: {
  initialRecap: EndedShowRecap;
}) {
  const [recap, setRecap] = useState(initialRecap);

  const refreshShow = useCallback(async () => {
    const res = await fetch(`/api/shows/${recap.slug}`);
    if (!res.ok) return;
    let data: PublicShow;
    try {
      data = await readResponseJson<PublicShow>(res);
    } catch {
      return;
    }
    if (data.status !== "ended") return;

    setRecap(
      buildEndedRecap({
        slug: data.slug,
        title: data.title,
        host: data.hostName ?? "Host",
        snapshot: data.snapshot,
        startedAt: data.startedAt ? Date.parse(data.startedAt) : null,
        endedAt: data.endedAt ? Date.parse(data.endedAt) : undefined,
        peakViewers: data.snapshot.stats?.peakViewers ?? 0,
        chatCount: data.snapshot.stats?.chatCount ?? 0,
        muxPlaybackId: data.muxPlaybackId,
      }),
    );
  }, [recap.slug]);

  // Waiting on Mux to finish packaging the recording. Each poll reaches out to
  // the Mux API server-side, so it stops entirely while the tab is hidden.
  useVisiblePoll(refreshShow, POLL_MS, !recap.muxPlaybackId);

  return <ShowEndedCreator recap={recap} />;
}
