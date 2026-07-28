"use client";

import { useTrackToggle, useTracks, VideoTrack } from "@/lib/live";
import { Track, type Room } from "livekit-client";
import { EyeOff, Mic, MicOff, MonitorUp, Square, Video, VideoOff } from "lucide-react";

import { PipStoreSuggestions } from "@/components/pip-store-suggestions";
import { ShareShowLinkButton } from "@/components/share-show-link-button";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  VideoFrame,
  VideoPlaceholder,
} from "@/components/video-placeholder";
import { useStartScreenShare } from "@/hooks/use-start-screen-share";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function ShareScreenGate({
  slug,
  room,
  sharing,
  onEndShow,
  onBeforeShare,
  pipSupported = false,
}: {
  slug: string;
  room: Room;
  sharing: boolean;
  onEndShow: () => void;
  onBeforeShare?: () => void | Promise<void>;
  pipSupported?: boolean;
}) {
  const { startScreenShare, starting, shareError, clearShareError } =
    useStartScreenShare({
      room,
      sharing,
      onBeforeShare,
      pipSupported,
    });

  const pipHint =
    !pipSupported && !sharing
      ? "Use Chrome for floating controls while sharing"
      : null;

  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const camera = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera,
  );

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="mx-auto w-full max-w-sm shrink-0 lg:mx-0 lg:w-64">
          <VideoFrame className="aspect-video w-full overflow-hidden rounded-2xl ring-2 ring-dashed ring-muted-foreground/25">
          {camera ? (
            <VideoTrack
              trackRef={camera}
              className="h-full w-full object-cover"
            />
          ) : (
            <VideoPlaceholder>Starting camera…</VideoPlaceholder>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/75 via-black/35 to-transparent p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                <EyeOff className="size-3" aria-hidden />
                Preview only
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/90 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-foreground">
                Connected
              </span>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-12 pt-8">
            <p className="text-center text-xs font-medium text-white sm:text-sm">
              Preview only — viewers watch your screen share
            </p>
          </div>

          <div className="absolute inset-x-0 bottom-4 flex justify-center">
            <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-2 py-1.5 backdrop-blur-sm">
              <MicToggle room={room} />
              <CameraToggle room={room} />
            </div>
          </div>
        </VideoFrame>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div className="flex flex-col gap-2 text-left">
          <h1 className="text-lg font-medium tracking-tight text-foreground sm:text-xl">
            Open a store, then share your screen
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Open a store in a new window, then share that window so viewers
            follow along while you shop.
          </p>
        </div>

        <PipStoreSuggestions className="w-full [&_ul]:max-h-40 [&_ul]:overflow-y-auto" />

        <ol className="flex flex-col gap-2 text-left text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
              2
            </span>
            <span>Share screen and pick the store window</span>
          </li>
          <li className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
              3
            </span>
            <span>
              {pipSupported
                ? "Paste product links in the floating studio"
                : "Paste product links in the studio panel"}
            </span>
          </li>
        </ol>

        <div className="flex flex-col gap-3">
          <Button
            type="button"
            onClick={startScreenShare}
            disabled={starting}
            aria-busy={starting}
            className="h-12 w-full rounded-full bg-live text-base font-medium text-live-foreground hover:bg-live/90"
          >
            <MonitorUp className="size-5" />
            {starting ? "Waiting for picker…" : "Share screen"}
          </Button>
          {shareError ? (
            <p className="text-sm text-destructive" role="alert">
              {shareError}{" "}
              <button
                type="button"
                onClick={clearShareError}
                className="underline underline-offset-2"
              >
                Dismiss
              </button>
            </p>
          ) : null}
          {pipHint ? (
            <p className="micro text-muted-foreground">{pipHint}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ShareShowLinkButton slug={slug} showPath className="min-w-0 flex-1" />

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={onEndShow}
                  aria-label="End show"
                  className="size-10 shrink-0 rounded-full border-live/50 text-live hover:bg-live hover:text-live-foreground"
                >
                  <Square className="size-4 fill-current" />
                </Button>
              }
            />
            <TooltipContent>End show</TooltipContent>
          </Tooltip>
        </div>
      </div>
      </div>
    </main>
  );
}

function CameraToggle({ room }: { room: Room }) {
  const { enabled, buttonProps } = useTrackToggle({
    source: Track.Source.Camera,
    room,
  });

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    trackEvent(AnalyticsEvent.HOST_CAMERA_TOGGLE, {
      area: "host_studio",
      enabled: !enabled,
    });
    buttonProps.onClick?.(e);
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            {...buttonProps}
            onClick={handleClick}
            aria-label={enabled ? "Turn camera off" : "Turn camera on"}
            className={cn(
              "size-10 rounded-full",
              enabled
                ? "border-foreground/20 bg-foreground/10"
                : "text-muted-foreground",
            )}
          >
            {enabled ? <Video /> : <VideoOff />}
          </Button>
        }
      />
      <TooltipContent>{enabled ? "Camera on" : "Camera off"}</TooltipContent>
    </Tooltip>
  );
}

function MicToggle({ room }: { room: Room }) {
  const { enabled, buttonProps } = useTrackToggle({
    source: Track.Source.Microphone,
    room,
  });

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    trackEvent(AnalyticsEvent.HOST_MIC_TOGGLE, {
      area: "host_studio",
      enabled: !enabled,
    });
    buttonProps.onClick?.(e);
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            {...buttonProps}
            onClick={handleClick}
            aria-label={enabled ? "Mute microphone" : "Unmute microphone"}
            className={cn(
              "size-10 rounded-full",
              enabled
                ? "border-foreground/20 bg-foreground/10"
                : "text-muted-foreground",
            )}
          >
            {enabled ? <Mic /> : <MicOff />}
          </Button>
        }
      />
      <TooltipContent>{enabled ? "Mic on" : "Mic off"}</TooltipContent>
    </Tooltip>
  );
}
