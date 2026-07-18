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
import { CurrentProduct } from "@/components/current-product";
import { ShoppingTrail } from "@/components/shopping-trail";
import { ViewerCount } from "@/components/viewer-count";
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

  if (error) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {error}
      </div>
    );
  }

  if (!conn) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
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
      data-lk-theme="default"
    >
      <WatchLayout />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

/**
 * The viewer's shopping experience: video on the left, the pinned product and
 * chat on the right. Must be inside <LiveKitRoom> so the hooks find the room.
 */
function WatchLayout() {
  const { pinned, trail, votesFor, myVotes, vote } = useStreamState({
    isHost: false,
  });

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          <Stage />
        </div>
        <ShoppingTrail products={trail} pinnedId={pinned?.id ?? null} />
      </div>

      <aside className="flex w-full flex-col gap-4 lg:w-96">
        <ViewerCount />
        <CurrentProduct
          product={pinned}
          votes={votesFor(pinned?.id ?? "")}
          myVote={pinned ? myVotes[pinned.id] : undefined}
          onVote={(choice) => pinned && vote(pinned.id, choice)}
        />
        <ChatPanel className="h-96" />
      </aside>
    </div>
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
    return (
      <div className="flex h-full items-center justify-center text-sm text-zinc-400">
        Waiting for the host to start…
      </div>
    );
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
        <div className="absolute bottom-3 right-3 aspect-square w-24 overflow-hidden rounded-full border-2 border-white/80 shadow-lg sm:w-32 dark:border-zinc-900/80">
          <VideoTrack
            trackRef={camera}
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}
