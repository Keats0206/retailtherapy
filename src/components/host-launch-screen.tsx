"use client";

import { useEffect, useRef } from "react";
import { type Room } from "livekit-client";
import {
  Mic,
  MicOff,
  MonitorUp,
  Video,
  VideoOff,
} from "lucide-react";

import { EndLiveShowButton } from "@/components/end-live-show-button";
import { hostShowPath } from "@/lib/show-urls";
import { GoLiveChatRail } from "@/components/go-live-chat-rail";
import {
  PostLiveSteps,
  type PostLiveProgress,
} from "@/components/go-live-steps";
import { ShareShowLinkButton } from "@/components/share-show-link-button";
import {
  StoreIdeasMenu,
  StoreLauncher,
  type ChallengeStore,
} from "@/components/store-launcher";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { VideoPlaceholder } from "@/components/video-placeholder";
import { useStartScreenShare } from "@/hooks/use-start-screen-share";
import { cn } from "@/lib/utils";

export type MediaControls = {
  stream: MediaStream | null;
  cameraOn: boolean;
  micOn: boolean;
  toggleCamera: () => void;
  toggleMic: () => void;
  cameraError: string | null;
  /** True between asking for devices and the browser answering. */
  requesting: boolean;
  retry: () => void;
  stop: () => void;
};

export type HostLaunchScreenProps = {
  title: string;
  error: string | null;
  media: MediaControls;
  liveShowSlug?: string | null;
  liveShowTitle?: string | null;
  onResumeLiveShow?: () => void;
  resumeLoading?: boolean;
};

/**
 * Pre-show holding screen while the host frames themselves before go-live.
 * Once live, the studio handoff is `StudioLayout` in host-live-broadcast.
 */
export function HostLaunchScreen(props: HostLaunchScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {props.liveShowSlug ? (
        <ExistingShowNotice
          slug={props.liveShowSlug}
          title={props.liveShowTitle}
          onResume={props.onResumeLiveShow}
          resumeLoading={props.resumeLoading}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-muted p-3 max-lg:aspect-video lg:p-4">
          <div className="relative aspect-video max-h-full w-full max-w-full overflow-hidden bg-black">
            <PreviewCamera media={props.media} />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 p-3 lg:p-4">
              <h1 className="pointer-events-auto inline-block truncate rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                {props.title || "Untitled show"}
              </h1>
            </div>
          </div>

          {props.error ? (
            <div className="absolute inset-x-3 bottom-3 lg:inset-x-4 lg:bottom-4">
              <InlineError message={props.error} />
            </div>
          ) : null}
        </main>

        <div className="flex w-full shrink-0 flex-col border-border/60 max-lg:min-h-0 max-lg:flex-1 max-lg:border-t lg:w-96 lg:border-l">
          <GoLiveChatRail live={false} className="min-h-0 flex-1" />
        </div>
      </div>

      <footer className="grid shrink-0 grid-cols-3 items-center gap-3 border-t border-border/60 px-4 py-3">
        <div />
        <div className="flex items-center justify-center gap-2">
          <PreviewMediaToggles media={props.media} />
        </div>
        <div />
      </footer>
    </div>
  );
}

function ShareScreenAction({
  room,
  sharing,
  pipSupported,
}: {
  room: Room;
  sharing: boolean;
  pipSupported: boolean;
}) {
  const { startScreenShare, starting, shareError, clearShareError } =
    useStartScreenShare({ room, sharing });

  return (
    <div className="flex flex-col gap-2">
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
        className="w-fit gap-2 bg-live text-live-foreground hover:bg-live/90"
      >
        <MonitorUp className="size-4" />
        {starting ? "Waiting for picker…" : "Share shopping window"}
      </Button>

      {!pipSupported ? (
        <p className="micro text-muted-foreground">
          Use Chrome for floating controls while sharing
        </p>
      ) : null}
    </div>
  );
}

/** Setup checklist for the studio rail — open a store, then share that window. */
export function HostLiveSetupSteps({
  slug,
  room,
  sharing,
  pipSupported,
  challengeStore,
  progress,
  onStoreOpened,
}: {
  slug: string;
  room: Room;
  sharing: boolean;
  pipSupported: boolean;
  challengeStore?: ChallengeStore | null;
  progress: PostLiveProgress;
  onStoreOpened: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <PostLiveSteps
        progress={progress}
        actions={{
          store: (
            <div className="flex flex-col gap-2">
              <StoreLauncher
                challengeStore={challengeStore}
                onOpened={onStoreOpened}
              />
              {challengeStore ? (
                <StoreIdeasMenu onOpened={onStoreOpened} placement="down" />
              ) : null}
            </div>
          ),
          share: (
            <ShareScreenAction
              room={room}
              sharing={sharing}
              pipSupported={pipSupported}
            />
          ),
        }}
      />
      <ShareShowLinkButton slug={slug} size="sm" className="w-fit" />
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
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-live/30 bg-live/10 px-4 py-2.5">
      <p className="text-sm text-muted-foreground">
        {title ? <span className="text-foreground">{title}</span> : "A show"} is
        still live at {hostShowPath(slug)}. Reconnect to keep hosting, or end it before
        starting a new one.
      </p>
      <div className="flex flex-wrap gap-2">
        {onResume ? (
          <Button
            type="button"
            size="sm"
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
  const { stream, cameraOn, cameraError, requesting } = media;

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
        className="h-full w-full scale-x-[-1] object-cover"
      />
    );
  }

  return (
    <VideoPlaceholder>
      {requesting
        ? "Allow camera access to see yourself"
        : cameraError
          ? "Camera unavailable — check browser permissions"
          : "Camera off"}
    </VideoPlaceholder>
  );
}

function PreviewMediaToggles({ media }: { media: MediaControls }) {
  const { cameraOn, micOn, toggleCamera, toggleMic, stream } = media;

  return (
    <>
      <BarToggle
        on={micOn}
        disabled={!stream}
        onClick={toggleMic}
        label={micOn ? "Mute microphone" : "Unmute microphone"}
        icon={micOn ? <Mic /> : <MicOff />}
      />
      <BarToggle
        on={cameraOn}
        disabled={!stream}
        onClick={toggleCamera}
        label={cameraOn ? "Turn camera off" : "Turn camera on"}
        icon={cameraOn ? <Video /> : <VideoOff />}
      />
    </>
  );
}

function BarToggle({
  on,
  icon,
  label,
  onClick,
  disabled,
}: {
  on: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={cn(
              "size-11 rounded-full",
              on
                ? "border-foreground/20 bg-foreground/10"
                : "border-destructive/40 bg-destructive/10 text-destructive",
            )}
          >
            {icon}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
