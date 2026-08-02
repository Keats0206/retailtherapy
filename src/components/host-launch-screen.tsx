"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTrackToggle, useTracks, VideoTrack } from "@/lib/live";
import { Track, type Room } from "livekit-client";
import {
  Check,
  Mic,
  MicOff,
  MonitorUp,
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
import { ViewerCount } from "@/components/viewer-count";
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

type OfflineProps = {
  live: false;
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

type LiveProps = {
  live: true;
  slug: string;
  title: string;
  room: Room;
  sharing: boolean;
  onEndShow: () => void;
  onBeforeShare?: () => void | Promise<void>;
  pipSupported?: boolean;
};

export type HostLaunchScreenProps = OfflineProps | LiveProps;

/**
 * One screen for the whole launch. Going live doesn't navigate anywhere — the
 * same layout flips from "get ready" to "you're live", so the host watches
 * viewers arrive while they line up the share.
 */
export function HostLaunchScreen(props: HostLaunchScreenProps) {
  const live = props.live;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      {!live && props.liveShowSlug ? (
        <ExistingShowNotice
          slug={props.liveShowSlug}
          title={props.liveShowTitle}
          onResume={props.onResumeLiveShow}
          resumeLoading={props.resumeLoading}
        />
      ) : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        <div className="mx-auto w-full max-w-sm shrink-0 lg:mx-0 lg:w-64">
          <VideoFrame
            className={cn(
              "aspect-video w-full overflow-hidden rounded-2xl",
              live && "ring-2 ring-live/40",
            )}
          >
            {live ? (
              <>
                <LiveCamera />
                <LiveKitMediaToggles room={props.room} />
              </>
            ) : (
              <>
                <PreviewCamera media={props.media} />
                <PreviewMediaToggles media={props.media} />
              </>
            )}
          </VideoFrame>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-3 text-left">
            {/* Status swaps in place — the host stays on the same screen. */}
            {live ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-live-foreground">
                  <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
                  Live
                </span>
                <ViewerCount className="text-muted-foreground" />
              </div>
            ) : (
              <span className="micro text-muted-foreground">
                Get ready to go live
              </span>
            )}

            {live ? (
              <h1 className="text-xl font-medium tracking-tight text-foreground sm:text-2xl">
                {props.title || "Untitled show"}
              </h1>
            ) : (
              <Input
                value={props.title}
                onChange={(e) => props.onTitleChange(e.target.value)}
                placeholder="Untitled show"
                aria-label="Show title"
                className="h-auto border-0 bg-transparent px-0 py-0 text-xl font-medium tracking-tight shadow-none placeholder:text-muted-foreground/50 focus-visible:border-transparent focus-visible:ring-0 sm:text-2xl"
              />
            )}

            {!live && props.setupDraft && !props.liveShowSlug ? (
              <SetupSummary draft={props.setupDraft} />
            ) : null}

            {/* The share link is the first thing that changes on going live. */}
            {live ? (
              <ShareShowLinkButton slug={props.slug} showPath />
            ) : props.liveShowSlug ? (
              <ShareShowLinkButton slug={props.liveShowSlug} showPath />
            ) : (
              <p className="text-sm text-muted-foreground">
                Your share link unlocks as soon as you go live.
              </p>
            )}
          </div>

          <PipStoreSuggestions className="w-full [&_ul]:max-h-40 [&_ul]:overflow-y-auto" />

          <LaunchChecklist live={live} />

          <p className="micro text-muted-foreground">
            Window lets you switch tabs — Tab only shares one page.
          </p>

          {live ? (
            <LiveShareControls
              room={props.room}
              sharing={props.sharing}
              onBeforeShare={props.onBeforeShare}
              pipSupported={props.pipSupported ?? false}
              onEndShow={props.onEndShow}
            />
          ) : (
            <OfflineGoLiveControls
              onGoLive={props.onGoLive}
              loading={props.loading}
              error={props.error}
              cameraError={props.media.cameraError}
              blockedBy={props.liveShowSlug ?? null}
            />
          )}
        </div>
      </div>
    </main>
  );
}

/**
 * The three steps are the same list before and after going live — step 1 just
 * ticks over. Numbering starts at 1 so it matches what the host has done.
 */
function LaunchChecklist({ live }: { live: boolean }) {
  const steps = [
    {
      label: "Go live so viewers can join",
      done: live,
    },
    {
      label: (
        <>
          In Chrome&apos;s share dialog pick{" "}
          <strong className="font-medium text-foreground">Window</strong> (not
          Tab), then select your shopping window
        </>
      ),
      done: false,
    },
    {
      label: "Paste product links in the studio as you shop",
      done: false,
    },
  ];

  return (
    <ol className="flex flex-col gap-2 text-left text-sm text-muted-foreground">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-3">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
              step.done
                ? "bg-live text-live-foreground"
                : "bg-muted text-foreground",
            )}
          >
            {step.done ? <Check className="size-3.5" /> : i + 1}
          </span>
          <span className={cn(step.done && "line-through opacity-60")}>
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

function OfflineGoLiveControls({
  onGoLive,
  loading,
  error,
  cameraError,
  blockedBy,
}: {
  onGoLive: () => void;
  loading: boolean;
  error: string | null;
  cameraError: string | null;
  blockedBy: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      {cameraError ? <InlineError message={cameraError} /> : null}
      {error ? <InlineError message={error} /> : null}

      <Button
        onClick={onGoLive}
        disabled={loading || Boolean(blockedBy)}
        title={
          blockedBy
            ? "End your current live show before starting another"
            : "Creates a shareable show and starts recording automatically"
        }
        className="h-12 w-full rounded-full bg-live text-base font-medium text-live-foreground hover:bg-live/90 sm:h-14 sm:text-lg"
      >
        {loading ? "Starting…" : "Go live"}
      </Button>
      <p className="micro text-muted-foreground">
        You&apos;ll share your shopping window on this screen once you&apos;re
        live.
      </p>
    </div>
  );
}

function LiveShareControls({
  room,
  sharing,
  onBeforeShare,
  pipSupported,
  onEndShow,
}: {
  room: Room;
  sharing: boolean;
  onBeforeShare?: () => void | Promise<void>;
  pipSupported: boolean;
  onEndShow: () => void;
}) {
  const { startScreenShare, starting, shareError, clearShareError } =
    useStartScreenShare({ room, sharing, onBeforeShare, pipSupported });

  return (
    <div className="flex flex-col gap-3">
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

      <Button
        type="button"
        onClick={startScreenShare}
        disabled={starting}
        aria-busy={starting}
        className="h-12 w-full rounded-full bg-live text-base font-medium text-live-foreground hover:bg-live/90 sm:h-14 sm:text-lg"
      >
        <MonitorUp className="size-5" />
        {starting ? "Waiting for picker…" : "Share shopping window"}
      </Button>

      {!pipSupported ? (
        <p className="micro text-muted-foreground">
          Use Chrome for floating controls while sharing
        </p>
      ) : null}

      <button
        type="button"
        onClick={onEndShow}
        className="w-fit text-sm text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
      >
        End show
      </button>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p
      className="border-l-2 border-destructive py-1 pl-3 text-sm text-destructive"
      role="alert"
    >
      {message}
    </p>
  );
}

function ExistingShowNotice({
  slug,
  title,
  onResume,
  resumeLoading,
}: {
  slug: string;
  title?: string | null;
  onResume?: () => void;
  resumeLoading?: boolean;
}) {
  return (
    <div className="mb-6 flex w-full flex-col gap-3 rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/8">
      <div className="flex flex-col gap-1">
        <span className="micro inline-flex items-center gap-2 text-live">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
          Show still live
        </span>
        <p className="text-sm text-muted-foreground">
          {title ? (
            <>
              <span className="text-foreground">{title}</span> is still live at
              /s/{slug}. Reconnect to keep hosting, or end it before starting a
              new one.
            </>
          ) : (
            <>
              You still have a live show at /s/{slug}. Reconnect to keep hosting,
              or end it before starting a new one.
            </>
          )}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {onResume ? (
          <Button
            type="button"
            disabled={resumeLoading}
            className="bg-live text-live-foreground hover:bg-live/90"
            onClick={onResume}
          >
            {resumeLoading ? "Reconnecting…" : "Open studio"}
          </Button>
        ) : null}
        <EndLiveShowButton slug={slug} title={title ?? "Live show"} />
      </div>
    </div>
  );
}

function PreviewCamera({ media }: { media: MediaControls }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, cameraOn, cameraError } = media;

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.srcObject = cameraOn && stream ? stream : null;
  }, [cameraOn, stream]);

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

function LiveCamera() {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false });
  const camera = tracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.Camera,
  );

  if (!camera) {
    return <VideoPlaceholder>Starting camera…</VideoPlaceholder>;
  }

  return <VideoTrack trackRef={camera} className="h-full w-full object-cover" />;
}

function ToggleBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-x-0 bottom-4 flex justify-center">
      <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-2 py-1.5 backdrop-blur-sm">
        {children}
      </div>
    </div>
  );
}

function PreviewMediaToggles({ media }: { media: MediaControls }) {
  const { cameraOn, micOn, toggleCamera, toggleMic, stream } = media;

  return (
    <ToggleBar>
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
    </ToggleBar>
  );
}

function LiveKitMediaToggles({ room }: { room: Room }) {
  return (
    <ToggleBar>
      <MicToggle room={room} />
      <CameraToggle room={room} />
    </ToggleBar>
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
          {focus ? <span className="text-muted-foreground"> · {focus}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
