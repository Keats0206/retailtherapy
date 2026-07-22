"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

import { ChatPanel } from "@/components/chat-panel";
import { ShowEndedViewer } from "@/components/show-ended-viewer";
import { Button } from "@/components/ui/button";
import {
  CAMERA_BUBBLE,
  VideoFrame,
  VideoPlaceholder,
} from "@/components/video-placeholder";
import { ViewerCount } from "@/components/viewer-count";
import { WatchLayout } from "@/components/watch-layout";
import { buildEndedRecap } from "@/lib/show-recap";
import type { PublicShow } from "@/lib/show-public";
import { useStreamState } from "@/lib/stream-state";

type Connection = { token: string; url: string };

const POLL_MS = 5_000;

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
    const id = setInterval(() => void refreshShow(), POLL_MS);
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

  return <LiveViewer show={show} onShowEnded={setShow} />;
}

function LiveViewer({
  show,
  onShowEnded,
}: {
  show: PublicShow;
  onShowEnded: (show: PublicShow) => void;
}) {
  const [conn, setConn] = useState<Connection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room: show.roomName, role: "viewer" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to connect");
        if (!cancelled) setConn({ token: data.token, url: data.url });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to connect");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [show.roomName]);

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch(`/api/shows/${show.slug}`);
      if (!res.ok) return;
      const data = (await res.json()) as PublicShow;
      if (data.status === "ended") onShowEnded(data);
    }, POLL_MS);
    return () => clearInterval(id);
  }, [onShowEnded, show.slug]);

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <h1 className="text-xl font-normal tracking-tight">{show.title}</h1>
        <p className="text-sm text-destructive">{error}</p>
        <Link href="/dashboard">
          <Button variant="outline" size="micro">
            Back to home
          </Button>
        </Link>
      </main>
    );
  }

  if (!conn) {
    return (
      <div className="micro flex flex-1 items-center justify-center bg-black text-white/40">
        Connecting…
      </div>
    );
  }

  return (
    <LiveKitRoom
      token={conn.token}
      serverUrl={conn.url}
      connect
      video={false}
      audio={false}
      data-lk-theme="retail"
      className="flex min-h-0 flex-1 flex-col"
    >
      <Watch />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

function Watch() {
  const stream = useStreamState({ isHost: false });

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <WatchLayout
        stream={stream}
        stage={<Stage />}
        viewers={<ViewerCount />}
        chat={<ChatPanel className="min-h-0 flex-1" />}
      />
    </main>
  );
}

function Stage() {
  const tracks = useTracks(
    [Track.Source.ScreenShare, Track.Source.Camera],
    { onlySubscribed: true },
  );

  const share = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const camera = tracks.find((t) => t.source === Track.Source.Camera);

  if (!share && !camera) {
    return <VideoPlaceholder>Waiting for the host to start…</VideoPlaceholder>;
  }

  if (!share) {
    return (
      <VideoTrack trackRef={camera!} className="h-full w-full object-cover" />
    );
  }

  return (
    <div className="relative h-full w-full">
      <VideoTrack trackRef={share} className="h-full w-full object-contain" />
      {camera && (
        <VideoFrame className={CAMERA_BUBBLE}>
          <VideoTrack
            trackRef={camera}
            className="h-full w-full object-cover"
          />
        </VideoFrame>
      )}
    </div>
  );
}
