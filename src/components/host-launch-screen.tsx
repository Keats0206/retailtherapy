"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTrackToggle, useTracks, VideoTrack } from "@/lib/live";
import { Track, type Room } from "livekit-client";
import {
  Mic,
  MicOff,
  MonitorUp,
  Square,
  Video,
  VideoOff,
} from "lucide-react";

import { EndLiveShowButton } from "@/components/end-live-show-button";
import { PipStoreSuggestions } from "@/components/pip-store-suggestions";
import { ShareShowLinkButton } from "@/components/share-show-link-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import type { ShowSetupDraft } from "@/lib/show-setup";
import { cn } from "@/lib/utils";

export type MediaControls = {
  stream: MediaStream | null;
  cameraOn: boolean;
  micOn: boolean;
  toggleCamera: () => void;
  toggleMic: () => void;
  cameraError: string | null;
  stop: () => void;
};

export type HostLaunchStage = "preshow" | "awaiting-share";

type PreshowProps = {
  stage: "preshow";
  title: string;
  onTitleChange: (value: string) => void;
  onGoLive: () => void;
  loading: boolean;
  error: string | null;
  media: MediaControls;
  setupDraft?: ShowSetupDraft | null;
  liveShowSlug?: string | null;
  liveShowTitle?: string | null;
  onResumeLiveShow?: () => void;
  resumeLoading?: boolean;
};

type AwaitingShareProps = {
  stage: "awaiting-share";
  slug: string;
  title: string;
  room: Room;
  sharing: boolean;
  onEndShow: () => void;
  onBeforeShare?: () => void | Promise<void>;
  pipSupported?: boolean;
};

export type HostLaunchScreenProps = PreshowProps | AwaitingShareProps;

export function HostLaunchScreen(props: HostLaunchScreenProps) {
  if (props.stage === "preshow") {
    return <PreshowLaunch {...props} />;
  }
  return <AwaitingShareLaunch {...props} />;
}

function PreshowLaunch({
  title,
  onTitleChange,
  onGoLive,
  loading,
  error,
  media,
  setupDraft,
  liveShowSlug,
  liveShowTitle,
  onResumeLiveShow,
  resumeLoading,
}: PreshowProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      {liveShowSlug ? (
        <div className="mb-6 flex w-full flex-col gap-3 rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/8">
          <div className="flex flex-col gap-1">
            <span className="micro inline-flex items-center gap-2 text-live">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
              Show still live
            </span>
            <p className="text-sm text-muted-foreground">
              {liveShowTitle ? (
                <>
                  <span className="text-foreground">{liveShowTitle}</span> is
                  still live at /s/{liveShowSlug}. Reconnect to keep hosting, or
                  end it before starting a new one.
                </>
              ) : (
                <>
                  You still have a live show at /s/{liveShowSlug}. Reconnect to
                  keep hosting, or end it before starting a new one.
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onResumeLiveShow ? (
              <Button
                type="button"
                disabled={resumeLoading}
                className="bg-live text-live-foreground hover:bg-live/90"
                onClick={onResumeLiveShow}
              >
                {resumeLoading ? "Reconnecting…" : "Open studio"}
              </Button>
            ) : null}
            <EndLiveShowButton
              slug={liveShowSlug}
              title={liveShowTitle ?? "Live show"}
            />
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <LaunchCameraPanel>
          <PreviewCamera media={media} videoRef={videoRef} />
          <PreviewMediaToggles media={media} />
        </LaunchCameraPanel>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-3 text-left">
            <h1 className="text-lg font-medium tracking-tight text-foreground sm:text-xl">
              Get ready to go live
            </h1>

            <Input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Untitled show"
              aria-label="Show title"
              className="h-auto border-0 bg-transparent px-0 py-0 text-xl font-medium tracking-tight shadow-none placeholder:text-muted-foreground/50 focus-visible:border-transparent focus-visible:ring-0 sm:text-2xl"
            />

            {setupDraft && !liveShowSlug ? (
              <SetupSummary draft={setupDraft} />
            ) : null}

            {liveShowSlug ? (
              <ShareShowLinkButton slug={liveShowSlug} showPath />
            ) : (
              <p className="text-sm text-muted-foreground">
                Your share link unlocks as soon as you go live.
              </p>
            )}
          </div>

          <PipStoreSuggestions className="w-full [&_ul]:max-h-40 [&_ul]:overflow-y-auto" />

          <ol className="flex flex-col gap-2 text-left text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                2
              </span>
              <span>
                Go live, then in Chrome&apos;s share dialog pick{" "}
                <strong className="font-medium text-foreground">Window</strong>{" "}
                (not Tab) and select your shopping window
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                3
              </span>
              <span>Paste product links in the studio as you shop</span>
            </li>
          </ol>

          <p className="micro text-muted-foreground">
            Window lets you switch tabs — Tab only shares one page.
          </p>

          {media.cameraError ? (
            <p
              className="border-l-2 border-destructive py-1 pl-3 text-sm text-destructive"
              role="alert"
            >
              {media.cameraError}
            </p>
          ) : null}

          {error ? (
            <p
              className="border-l-2 border-destructive py-1 pl-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-3">
            <Button
              onClick={onGoLive}
              disabled={loading || Boolean(liveShowSlug)}
              title={
                liveShowSlug
                  ? "End your current live show before starting another"
                  : "Creates a shareable show and starts recording automatically"
              }
              className="h-12 w-full rounded-full bg-live text-base font-medium text-live-foreground hover:bg-live/90 sm:h-14 sm:text-lg"
            >
              {loading ? "Starting…" : "Go live"}
            </Button>
            {liveShowSlug ? (
              <p className="text-sm text-muted-foreground">
                Share the link above so viewers can join before you reconnect.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function AwaitingShareLaunch({
  slug,
  title,
  room,
  sharing,
  onEndShow,
  onBeforeShare,
  pipSupported = false,
}: AwaitingShareProps) {
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
    <main className="live-share-frame live-share-frame--live mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-live-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
          Live
        </span>
        <p className="text-sm text-muted-foreground">
          Viewers can join — share your shopping window to start presenting
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <LaunchCameraPanel presenting>
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-live-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
                On camera
              </span>
            </div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pb-12 pt-8">
            <p className="text-center text-xs font-medium text-white sm:text-sm">
              You&apos;re presenting — viewers watch your shared window
            </p>
          </div>

          <LiveKitMediaToggles room={room} />
        </LaunchCameraPanel>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-2 text-left">
            <h1 className="text-lg font-medium tracking-tight text-foreground sm:text-xl">
              You&apos;re live — share your shopping window
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {title}
            </p>
          </div>

          <PipStoreSuggestions className="w-full [&_ul]:max-h-40 [&_ul]:overflow-y-auto" />

          <ol className="flex flex-col gap-2 text-left text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                2
              </span>
              <span>
                In Chrome&apos;s share dialog, click{" "}
                <strong className="font-medium text-foreground">Window</strong>{" "}
                (not Tab), then select your shopping window
              </span>
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

          <p className="micro text-muted-foreground">
            Window lets you switch tabs — Tab only shares one page.
          </p>

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              onClick={startScreenShare}
              disabled={starting}
              aria-busy={starting}
              className="h-12 w-full rounded-full bg-live text-base font-medium text-live-foreground hover:bg-live/90"
            >
              <MonitorUp className="size-5" />
              {starting ? "Waiting for picker…" : "Share shopping window"}
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
                    className="size-10 shrink-0 rounded-full border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
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

function LaunchCameraPanel({
  children,
  presenting = false,
}: {
  children: React.ReactNode;
  presenting?: boolean;
}) {
  return (
    <div className="mx-auto w-full max-w-sm shrink-0 lg:mx-0 lg:w-64">
      <VideoFrame
        className={cn(
          "aspect-video w-full overflow-hidden rounded-2xl",
          presenting && "ring-2 ring-live/40",
        )}
      >
        {children}
      </VideoFrame>
    </div>
  );
}

function PreviewCamera({
  media,
  videoRef,
}: {
  media: MediaControls;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  const { stream, cameraOn, cameraError } = media;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = cameraOn && stream ? stream : null;
  }, [cameraOn, stream, videoRef]);

  if (cameraOn && stream) {
    return (
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="h-full w-full object-cover"
      />
    );
  }

  return (
    <VideoPlaceholder>
      {cameraError ? "Camera unavailable" : "Starting camera…"}
    </VideoPlaceholder>
  );
}

function PreviewMediaToggles({ media }: { media: MediaControls }) {
  const { cameraOn, micOn, toggleCamera, toggleMic, stream } = media;

  return (
    <div className="absolute inset-x-0 bottom-4 flex justify-center">
      <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-2 py-1.5 backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant={micOn ? "secondary" : "outline"}
                size="icon"
                onClick={toggleMic}
                disabled={!stream}
                aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                className={cn(
                  "size-10 rounded-full",
                  !micOn &&
                    "border-white/30 bg-black/40 text-white hover:bg-black/60",
                )}
              >
                {micOn ? <Mic /> : <MicOff />}
              </Button>
            }
          />
          <TooltipContent>{micOn ? "Mic on" : "Mic off"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant={cameraOn ? "secondary" : "outline"}
                size="icon"
                onClick={toggleCamera}
                disabled={!stream}
                aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
                className={cn(
                  "size-10 rounded-full",
                  !cameraOn &&
                    "border-white/30 bg-black/40 text-white hover:bg-black/60",
                )}
              >
                {cameraOn ? <Video /> : <VideoOff />}
              </Button>
            }
          />
          <TooltipContent>{cameraOn ? "Camera on" : "Camera off"}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function LiveKitMediaToggles({ room }: { room: Room }) {
  return (
    <div className="absolute inset-x-0 bottom-4 flex justify-center">
      <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-2 py-1.5 backdrop-blur-sm">
        <MicToggle room={room} />
        <CameraToggle room={room} />
      </div>
    </div>
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

function SetupSummary({
  draft,
  className,
}: {
  draft: ShowSetupDraft;
  className?: string;
}) {
  const intentLabel =
    draft.intent === "season"
      ? "Season"
      : draft.intent === "event"
        ? "Event"
        : draft.intent === "browsing"
          ? "Browsing"
          : null;
  const focus = [draft.detail, ...draft.items].filter(Boolean).join(" · ");

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-2 rounded-xl bg-muted/40 p-4 text-left ring-1 ring-foreground/8",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="micro text-muted-foreground">Show setup</span>
        <Link
          href="/host/setup"
          className="micro text-foreground underline-offset-4 hover:underline"
        >
          Edit
        </Link>
      </div>
      {intentLabel ? (
        <p className="text-sm text-foreground">
          {intentLabel}
          {focus ? (
            <span className="text-muted-foreground"> · {focus}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
