"use client";

import { useEffect, useState } from "react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

import {
  LiveRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
} from "@/lib/live";

import { ChatPanel } from "@/components/chat-panel";
import { WatchShellSkeleton } from "@/components/show-shell-skeleton";
import {
  CAMERA_BUBBLE,
  VideoFrame,
  VideoPlaceholder,
} from "@/components/video-placeholder";
import { WatchLayout } from "@/components/watch-layout";
import { readResponseJson } from "@/lib/fetch-json";
import { useStreamState } from "@/lib/stream-state";
import { getVoterDisplayName } from "@/lib/voter-identity";

type Connection = { token: string; url: string };

export default function Player({
  room,
  liveConnection = null,
}: {
  room: string;
  liveConnection?: Connection | null;
}) {
  const [conn, setConn] = useState<Connection | null>(liveConnection);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (conn) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            room,
            role: "viewer",
            displayName: getVoterDisplayName(),
          }),
        });
        const data = await readResponseJson<{
          error?: string;
          token: string;
          url: string;
        }>(res);
        if (!res.ok) throw new Error(data.error ?? "Failed to connect");
        if (!cancelled) setConn({ token: data.token, url: data.url });
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Failed to connect");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conn, room]);

  if (error) {
    return (
      <div className="micro flex flex-1 items-center justify-center bg-black text-white/40">
        {error}
      </div>
    );
  }

  if (!conn) {
    return <WatchShellSkeleton statusLabel="Joining room…" />;
  }

  return (
    <LiveRoom
      token={conn.token}
      serverUrl={conn.url}
      video={false}
      audio={false}
      localRole="viewer"
      localSlug={room}
      className="flex min-h-0 flex-1 flex-col"
    >
      <Watch />
      <RoomAudioRenderer />
    </LiveRoom>
  );
}

function Watch() {
  const stream = useStreamState({ isHost: false });

  return (
    <WatchLayout
      stream={stream}
      stage={<Stage />}
      chat={<ChatPanel variant="rail" className="min-h-0 flex-1" />}
    />
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
