"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { buildEndedRecap } from "@/lib/show-recap";
import type { PublicShow } from "@/lib/show-public";

const ShowEndedViewer = dynamic(
  () =>
    import("@/components/show-ended-viewer").then((m) => ({
      default: m.ShowEndedViewer,
    })),
  { ssr: false },
);

const ShowLiveViewer = dynamic(() => import("./show-live-viewer"), {
  ssr: false,
  loading: () => (
    <div className="micro flex flex-1 items-center justify-center bg-black text-white/40">
      Loading…
    </div>
  ),
});

/** HTTP fallback for status while live (data channel handles end-of-show). */
const FALLBACK_POLL_MS = 30_000;

export default function ShowPageClient({
  initialShow,
}: {
  initialShow: PublicShow;
}) {
  const [show, setShow] = useState(initialShow);

  const refreshShow = useCallback(async () => {
    const res = await fetch(`/api/shows/${show.slug}`);
    if (!res.ok) return;
    const data = (await res.json()) as PublicShow;
    setShow(data);
  }, [show.slug]);

  useEffect(() => {
    if (show.status !== "live") return;
    const id = setInterval(() => void refreshShow(), FALLBACK_POLL_MS);
    return () => clearInterval(id);
  }, [refreshShow, show.status]);

  if (show.status === "ended") {
    const recap = buildEndedRecap({
      slug: show.slug,
      title: show.title,
      host: show.hostName ?? "Host",
      snapshot: show.snapshot,
      startedAt: show.startedAt ? Date.parse(show.startedAt) : null,
      endedAt: show.endedAt ? Date.parse(show.endedAt) : undefined,
      peakViewers: show.snapshot.stats?.peakViewers ?? 0,
      chatCount: show.snapshot.stats?.chatCount ?? 0,
      muxPlaybackId: show.muxPlaybackId,
    });
    return (
      <ShowEndedViewer
        recap={recap}
        onRecordingReady={refreshShow}
        polling={!show.muxPlaybackId}
      />
    );
  }

  return <ShowLiveViewer show={show} onShowEnded={setShow} />;
}
