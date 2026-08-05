"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionState, Track } from "livekit-client";
import "@livekit/components-styles";

import {
  LiveRoom,
  RoomAudioRenderer,
  VideoTrack,
  useConnectionState,
  useTracks,
} from "@/lib/live";

import { ChatPanel } from "@/components/chat-panel";
import { WatchShellSkeleton } from "@/components/show-shell-skeleton";
import { Button } from "@/components/ui/button";
import {
  CAMERA_BUBBLE,
  VideoFrame,
  VideoPlaceholder,
} from "@/components/video-placeholder";
import { WatchLayout } from "@/components/watch-layout";
import { useViewerToken } from "@/hooks/use-viewer-token";
import { useVisiblePoll } from "@/hooks/use-visible-poll";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { readResponseJson } from "@/lib/fetch-json";
import type { PublicShow } from "@/lib/show-public";
import type { StreamSnapshot } from "@/lib/stream-state";
import { useStreamState } from "@/lib/stream-state";

const ShowEndedViewer = dynamic(
  () =>
    import("@/components/show-ended-viewer").then((m) => ({
      default: m.ShowEndedViewer,
    })),
  { ssr: false },
);

/**
 * Only used to notice the live → ended transition: the shopping state itself
 * arrives over the LiveKit data channel, and a host ending the show disconnects
 * the room immediately. Each poll costs a full row read plus the entire
 * snapshot on the wire, so a second-by-second cadence bought nothing a viewer
 * could perceive.
 */
const POLL_MS = 5_000;

export default function ShowPageClient({
  initialShow,
}: {
  initialShow: PublicShow;
}) {
  const router = useRouter();
  const [show, setShow] = useState(initialShow);

  const refreshShow = useCallback(async () => {
    const res = await fetch(`/api/shows/${show.slug}`);
    if (!res.ok) return;
    try {
      const data = await readResponseJson<PublicShow>(res);
      setShow(data);
    } catch {
      // Empty/invalid poll body — keep the last good snapshot.
    }
  }, [show.slug]);

  useVisiblePoll(refreshShow, POLL_MS, show.status === "live");

  useEffect(() => {
    if (show.status === "ended") {
      router.refresh();
    }
  }, [router, show.status]);

  if (show.status === "ended") {
    return null;
  }

  return <LiveViewer show={show} />;
}

function LiveViewer({ show }: { show: PublicShow }) {
  const { conn, error, isLoading } = useViewerToken(show.roomName);
  const [disconnected, setDisconnected] = useState(false);

  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-6 px-6 py-16 text-center">
        <h1 className="text-xl font-normal tracking-tight">{show.title}</h1>
        <p className="text-sm text-destructive">{error}</p>
        <Link href="/">
          <Button variant="outline" size="micro">
            Back to home
          </Button>
        </Link>
      </main>
    );
  }

  if (isLoading || !conn) {
    return (
      <WatchShellSkeleton
        statusLabel="Joining room…"
        title={show.title}
        hostName={show.hostName}
      />
    );
  }

  return (
    <LiveRoom
      key={conn.token}
      token={conn.token}
      serverUrl={conn.url}
      video={false}
      audio={false}
      onConnected={() => setDisconnected(false)}
      onDisconnected={() => setDisconnected(true)}
      localRole="viewer"
      localSlug={show.slug}
      className="flex min-h-0 flex-1 flex-col"
    >
      <WatchEnterTracker />
      {disconnected ? <ViewerReconnectBanner /> : null}
      <Watch initialSnapshot={show.snapshot} />
      <RoomAudioRenderer />
    </LiveRoom>
  );
}

function ViewerReconnectBanner() {
  return (
    <div
      className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-center text-sm text-destructive"
      role="alert"
    >
      Connection lost.{" "}
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="font-medium underline underline-offset-2"
      >
        Refresh to rejoin
      </button>
    </div>
  );
}

function WatchEnterTracker() {
  const connectionState = useConnectionState();
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current || connectionState !== ConnectionState.Connected) {
      return;
    }
    tracked.current = true;
    trackEvent(AnalyticsEvent.WATCH_ENTER, { area: "watch" });
  }, [connectionState]);

  return null;
}

function Watch({ initialSnapshot }: { initialSnapshot: StreamSnapshot }) {
  const stream = useStreamState({ isHost: false, initialSnapshot });

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      <WatchLayout
        stream={stream}
        stage={<Stage />}
        chat={<ChatPanel variant="rail" className="min-h-0 flex-1" />}
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
    return (
      <VideoPlaceholder>
        Waiting for the host to share their screen…
      </VideoPlaceholder>
    );
  }

  if (!share && camera) {
    return (
      <VideoTrack trackRef={camera} className="h-full w-full object-contain" />
    );
  }

  if (!share) {
    return (
      <VideoPlaceholder>
        Waiting for the host to share their screen…
      </VideoPlaceholder>
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
