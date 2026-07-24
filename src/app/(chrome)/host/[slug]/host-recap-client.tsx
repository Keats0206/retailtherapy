"use client";

import { useCallback, useEffect, useState } from "react";

import { ShowEndedCreator } from "@/components/show-ended-creator";
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
    const data = (await res.json()) as PublicShow;
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

  useEffect(() => {
    if (recap.muxPlaybackId) return;
    const id = setInterval(() => void refreshShow(), POLL_MS);
    return () => clearInterval(id);
  }, [recap.muxPlaybackId, refreshShow]);

  return <ShowEndedCreator recap={recap} />;
}
