"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ControlBar,
  LiveKitRoom,
  VideoTrack,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";

import { ChatPanel } from "@/components/chat-panel";
import { ShoppingTrail } from "@/components/shopping-trail";
import { StoreLinks } from "@/components/store-links";
import { StudioControls } from "@/components/studio-controls";
import { ViewerCount } from "@/components/viewer-count";
import { useStreamState } from "@/lib/stream-state";

type Connection = { token: string; url: string };

export default function HostClient({ room }: { room: string }) {
  const [conn, setConn] = useState<Connection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Absolute link viewers use to watch this stream.
  const watchPath = `/watch/${room}`;

  async function goLive() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/livekit/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, role: "host" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to start stream");
      setConn({ token: data.token, url: data.url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (conn) {
    return (
      <div className="flex min-h-0 flex-1 flex-col" data-lk-theme="default">
        <LiveKitRoom
          token={conn.token}
          serverUrl={conn.url}
          connect
          video
          audio
          onDisconnected={() => setConn(null)}
          className="flex min-h-0 flex-1 flex-col"
          data-lk-theme="default"
        >
          <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-6 py-3 dark:border-zinc-800">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
              You&rsquo;re live
            </span>
            <div className="flex items-center gap-4">
              <ViewerCount />
              <Link
                href={watchPath}
                target="_blank"
                className="text-sm font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
              >
                Open viewer page ↗
              </Link>
            </div>
          </div>
          <Studio />
        </LiveKitRoom>
      </div>
    );
  }

  // Pre-live: one button. Clicking it prompts for camera/mic in the browser.
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Go live
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Click below and allow camera + microphone access. You&rsquo;ll start
          broadcasting straight from this browser — no software to install.
        </p>
      </header>

      <button
        onClick={goLive}
        disabled={loading}
        className="w-fit rounded-full bg-red-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
      >
        {loading ? "Starting…" : "Go live"}
      </button>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <p className="text-sm text-zinc-500">
        Viewers will be able to watch at{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          {watchPath}
        </code>
      </p>
    </main>
  );
}

/**
 * The host's studio while live. Presenting isn't watching yourself: the video is
 * demoted to a narrow confidence monitor on the left — small camera, small
 * preview of what's being shared — and the shopping tools and chat get the room.
 *
 * Must be rendered inside <LiveKitRoom> — the shopping state and chat both ride
 * the room's data channel.
 */
function Studio() {
  const { pinned, trail, pin, unpin, setNote } = useStreamState({
    isHost: true,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col-reverse lg:flex-row">
      <ConfidenceMonitor />

      <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 xl:flex-row">
        <div className="flex min-w-0 flex-col gap-4 xl:flex-1">
          <StudioControls
            pinned={pinned}
            onPin={pin}
            onUnpin={unpin}
            onNote={setNote}
          />
          <StoreLinks />
          <ShoppingTrail
            products={trail}
            pinnedId={pinned?.id ?? null}
            onSelect={pin}
          />
        </div>

        <ChatPanel className="min-h-64 flex-1 xl:w-80 xl:flex-none" />
      </div>
    </div>
  );
}

/**
 * Everything the host needs to see about their own broadcast, and nothing more:
 * a thumbnail of their camera, a thumbnail of whatever they're sharing, and the
 * mic/camera/share/leave controls.
 */
function ConfidenceMonitor() {
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: false },
  );
  const local = tracks.filter((t) => t.participant.isLocal);
  const camera = local.find((t) => t.source === Track.Source.Camera);
  const share = local.find((t) => t.source === Track.Source.ScreenShare);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 border-t border-zinc-200 p-4 lg:w-64 lg:border-r lg:border-t-0 dark:border-zinc-800">
      <div className="flex gap-3 lg:flex-col">
        <Monitor label="You">
          {camera ? (
            <VideoTrack
              trackRef={camera}
              className="h-full w-full object-cover"
            />
          ) : (
            <Placeholder>Camera off</Placeholder>
          )}
        </Monitor>

        <Monitor label="On screen">
          {share ? (
            <VideoTrack
              trackRef={share}
              className="h-full w-full object-contain"
            />
          ) : (
            <Placeholder>Not sharing</Placeholder>
          )}
        </Monitor>
      </div>

      <ControlBar
        variation="minimal"
        controls={{
          microphone: true,
          camera: true,
          screenShare: true,
          chat: false,
          settings: false,
          leave: true,
        }}
      />
    </aside>
  );
}

function Monitor({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative aspect-video min-w-0 flex-1 overflow-hidden rounded-lg bg-black lg:flex-none">
      {children}
      <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
        {label}
      </span>
    </div>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center text-xs text-zinc-500">
      {children}
    </div>
  );
}
