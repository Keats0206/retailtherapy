"use client";

import { useTracks, VideoTrack } from "@/lib/live";
import { Track, type Room } from "livekit-client";

import { EndShowDialog } from "@/components/end-show-dialog";
import { FaceBubble } from "@/components/face-bubble";
import { HostControlBar } from "@/components/host-control-bar";
import { StudioRail } from "@/components/studio-layout";
import {
  PIP_CAMERA_BUBBLE,
  PIP_PREVIEW,
  VideoFrame,
  VideoPlaceholder,
} from "@/components/video-placeholder";
import { ViewerCount } from "@/components/viewer-count";
import { ViewerStageOverlays } from "@/components/viewer-stage-overlays";
import { usePollState } from "@/lib/poll-state";
import type { StreamState } from "@/lib/stream-store";
import { cn } from "@/lib/utils";

export function HostFloatingStudio({
  room,
  stream,
  poll,
  sharing,
  chatCount,
  onEndShow,
  pipSupported,
  endDialogOpen,
  onEndDialogOpenChange,
  onConfirmEndShow,
  ending,
  endingStep,
  endError,
}: {
  room: Room;
  stream: StreamState;
  poll: ReturnType<typeof usePollState>;
  sharing: boolean;
  chatCount: number;
  onEndShow: () => void;
  pipSupported: boolean;
  endDialogOpen: boolean;
  onEndDialogOpenChange: (open: boolean) => void;
  onConfirmEndShow: () => void;
  ending: boolean;
  endingStep: number;
  endError: string | null;
}) {
  const tracks = useTracks(
    [Track.Source.ScreenShare, Track.Source.Camera],
    { room, onlySubscribed: false },
  );
  const local = tracks.filter((t) => t.participant.isLocal);
  const share = local.find((t) => t.source === Track.Source.ScreenShare);
  const camera = local.find((t) => t.source === Track.Source.Camera);

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-background">
      <div className="relative shrink-0 border-b border-border/60 bg-black">
        <VideoFrame className={PIP_PREVIEW}>
          {share ? (
            <div className="relative h-full w-full">
              <VideoTrack
                trackRef={share}
                className="h-full w-full object-contain"
              />
              {camera && (
                <FaceBubble
                  trackRef={camera}
                  className={PIP_CAMERA_BUBBLE}
                  zoom={1.2}
                />
              )}
              <ViewerStageOverlays
                stream={stream}
                poll={poll}
                role="creator"
                size="compact"
              />
            </div>
          ) : camera ? (
            <VideoTrack trackRef={camera} className="h-full w-full object-cover" />
          ) : (
            <VideoPlaceholder>Waiting for the host to start…</VideoPlaceholder>
          )}
        </VideoFrame>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-2 bg-gradient-to-b from-black/75 via-black/35 to-transparent p-2">
          <div className="pointer-events-auto flex min-w-0 flex-col gap-1">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-live px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-live-foreground">
              <span className="size-1 animate-pulse rounded-full bg-live-foreground/80" />
              Live
            </span>
            <ViewerCount className="rounded-full bg-black/50 px-2 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-white backdrop-blur-sm [&_span:first-child]:bg-live" />
          </div>

          <div className="pointer-events-auto shrink-0 flex items-center gap-1">
            <HostControlBar
              room={room}
              sharing={sharing}
              pipSupported={pipSupported}
              variant="pip-overlay"
            />
          </div>
        </div>
      </div>

      <StudioRail
        stream={stream}
        poll={poll}
        chatCount={chatCount}
        variant="pip"
        className={cn("min-h-0 flex-1")}
        onEndShow={onEndShow}
      />

      <EndShowDialog
        open={endDialogOpen}
        onOpenChange={onEndDialogOpenChange}
        onConfirm={onConfirmEndShow}
        ending={ending}
        endingStep={endingStep}
        error={endError}
      />
    </div>
  );
}
