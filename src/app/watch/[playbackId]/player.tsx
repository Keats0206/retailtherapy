"use client";

import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

import { ChatPanel } from "@/components/chat-panel";
import {
  CAMERA_BUBBLE,
  VideoFrame,
  VideoPlaceholder,
} from "@/components/video-placeholder";
import { ViewerCount } from "@/components/viewer-count";
import { WatchLayout } from "@/components/watch-layout";
import { useStreamState } from "@/lib/stream-state";

type Connection = { token: string; url: string };

export default function Player({ room }: { room: string }) {
  const [conn, setConn] = useState<Connection | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/livekit/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, role: "viewer" }),
        });
        const data = await res.json();
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
  }, [room]);

  // These stand in for the whole theatre, so they fill it rather than sitting in
  // an aspect-video box with dead white underneath.
  if (error) {
    return (
      <div className="micro flex flex-1 items-center justify-center bg-black text-white/40">
        {error}
      </div>
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
      // Viewers are subscribe-only: no camera/mic published. They can still
      // publish *data*, which is what chat and voting use.
      video={false}
      audio={false}
      data-lk-theme="retail"
      // LiveKitRoom renders a plain div, which would otherwise break the
      // flex chain the full-height theatre layout depends on.
      className="flex min-h-0 flex-1 flex-col"
    >
      <Watch />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

/**
 * The watch experience, wired to the live room. The layout itself lives in
 * `components/watch-layout.tsx` so /prototype can render it without LiveKit.
 * Must be inside <LiveKitRoom> so the hooks find the room.
 */
function Watch() {
  const stream = useStreamState({ isHost: false });

  return (
    <WatchLayout
      stream={stream}
      stage={<Stage />}
      viewers={<ViewerCount />}
      chat={<ChatPanel className="min-h-0 flex-1" />}
    />
  );
}

/**
 * What the host is publishing. When they're sharing a screen, the share is the
 * stage and their camera rides along in a small corner bubble — side-by-side
 * halves the size of both, and the thing being shopped is what matters. With no
 * share, the camera takes the full frame.
 */
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
      {/* `contain` so no part of what they're showing gets cropped away. */}
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
