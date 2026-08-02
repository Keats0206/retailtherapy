"use client";

import { useEffect, useRef } from "react";
import { useTrackToggle, useTracks, VideoTrack } from "@/lib/live";
import { Track, type Room } from "livekit-client";
import {
  Mic,
  MicOff,
  MonitorUp,
  Radio,
  Square,
  Video,
  VideoOff,
} from "lucide-react";

import { EndLiveShowButton } from "@/components/end-live-show-button";
import { GoLiveChatRail } from "@/components/go-live-chat-rail";
import {
  GO_LIVE_STEPS,
  GoLiveSteps,
  type GoLiveProgress,
} from "@/components/go-live-steps";
import { ShareShowLinkButton } from "@/components/share-show-link-button";
import {
  StoreIdeasMenu,
  StoreLauncher,
  type ChallengeStore,
} from "@/components/store-launcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ViewerCount } from "@/components/viewer-count";
import { VideoPlaceholder } from "@/components/video-placeholder";
import { useGoLiveProgress } from "@/hooks/use-go-live-progress";
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
  /** True between asking for devices and the browser answering. */
  requesting: boolean;
  retry: () => void;
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
  pipSupported?: boolean;
  challengeStore?: ChallengeStore | null;
};

export type HostLaunchScreenProps = OfflineProps | LiveProps;

/**
 * The whole launch, on one full-bleed screen: camera on the left at video
 * proportions, the ordered checklist stacked over chat on the right, and
 * controls across the bottom. The checklist retires once every step is done, so
 * chat — the only thing that keeps changing after that — takes the full rail.
 *
 * Going live doesn't navigate anywhere — the same layout flips from "get ready"
 * to "you're live" so the host watches viewers arrive while they line up the
 * share. It sits `fixed` above the site chrome deliberately: a header and
 * footer around a broadcast console read as a web page, not a studio, and the
 * host is about to be on camera.
 */
export function HostLaunchScreen(props: HostLaunchScreenProps) {
  const live = props.live;
  const { storeOpened, linkShared, markStoreOpened, markLinkShared } =
    useGoLiveProgress();

  const challengeStore: ChallengeStore | null = live
    ? (props.challengeStore ?? null)
    : challengeStoreFromDraft(props.setupDraft);

  const cameraReady = live
    ? true
    : Boolean(props.media.stream) && !props.media.cameraError;

  const progress: GoLiveProgress = {
    store: storeOpened,
    camera: cameraReady,
    live,
    share: live ? props.sharing : false,
    invite: linkShared,
  };

  const slug = live ? props.slug : (props.liveShowSlug ?? null);
  const stepsDone = GO_LIVE_STEPS.every((step) => progress[step.id]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {!live && props.liveShowSlug ? (
        <ExistingShowNotice
          slug={props.liveShowSlug}
          title={props.liveShowTitle}
          onResume={props.onResumeLiveShow}
          resumeLoading={props.resumeLoading}
        />
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* The camera side never scrolls: it's a monitor, and a console that
            slides under the mouse while the host is framing themselves is not
            one. The feed is sized to fit whatever room is left. */}
        <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black p-3 max-lg:aspect-video lg:p-4">
          <div
            className={cn(
              "relative aspect-video max-h-full w-full max-w-full overflow-hidden bg-black",
              live && "ring-2 ring-live/40",
            )}
          >
            {live ? <LiveCamera /> : <PreviewCamera media={props.media} />}
          </div>

          {/* Identity rides on the feed now that the console has no header. */}
          {/* Right padding leaves room for the permanent "Share the show"
              fixture that floats above this row. */}
          <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3 pr-36 lg:inset-x-4 lg:top-4 lg:pr-40">
            <div className="pointer-events-auto flex min-w-0 items-center gap-2">
              {live ? (
                <>
                  <LiveBadge />
                  <h1 className="truncate rounded-full bg-black/50 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
                    {props.title || "Untitled show"}
                  </h1>
                </>
              ) : (
                <Input
                  value={props.title}
                  onChange={(e) => props.onTitleChange(e.target.value)}
                  placeholder="Untitled show"
                  aria-label="Show title"
                  className="h-9 w-64 rounded-full border-0 bg-black/50 px-3 text-sm font-medium text-white shadow-none backdrop-blur-sm placeholder:text-white/50 focus-visible:ring-1 focus-visible:ring-white/40"
                />
              )}
            </div>
            {live ? (
              <ViewerCount className="pointer-events-auto rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur-sm" />
            ) : null}
          </div>

          {!live && props.error ? (
            <div className="absolute inset-x-3 bottom-3 lg:inset-x-4 lg:bottom-4">
              <InlineError message={props.error} />
            </div>
          ) : null}
        </main>

        <div className="flex w-full shrink-0 flex-col border-border/60 max-lg:min-h-0 max-lg:flex-1 max-lg:border-t lg:w-96 lg:border-l">
          {/* Checklist above chat, and only while there's something left to do:
              once the show is fully set up the host is watching the audience,
              not a list of ticks, so the rail hands the space back to chat. */}
          {!stepsDone ? (
            <div className="max-h-[55%] shrink-0 overflow-y-auto border-b border-border/60 px-4 py-3">
              <GoLiveSteps
                progress={progress}
                actions={{
                  store: (
                    <StoreLauncher
                      challengeStore={challengeStore}
                      onOpened={markStoreOpened}
                    />
                  ),
                  camera: !live ? (
                    <CameraGateAction media={props.media} />
                  ) : null,
                  live: !live ? (
                    <Button
                      onClick={props.onGoLive}
                      disabled={props.loading || Boolean(props.liveShowSlug)}
                      title={
                        props.liveShowSlug
                          ? "End your current live show before starting another"
                          : "Creates a shareable show and starts recording automatically"
                      }
                      className="w-fit gap-2 bg-live text-live-foreground hover:bg-live/90"
                    >
                      <Radio className="size-4" />
                      {props.loading ? "Starting…" : "Go live"}
                    </Button>
                  ) : null,
                  share: live ? (
                    <ShareScreenAction
                      room={props.room}
                      sharing={props.sharing}
                      pipSupported={props.pipSupported ?? false}
                    />
                  ) : null,
                  invite: slug ? (
                    <ShareShowLinkButton
                      slug={slug}
                      showPath
                      size="default"
                      className="w-fit"
                      onShared={markLinkShared}
                    />
                  ) : null,
                }}
              />
            </div>
          ) : null}

          <GoLiveChatRail live={live} className="min-h-0 flex-1" />
        </div>
      </div>

      <footer className="grid shrink-0 grid-cols-3 items-center gap-3 border-t border-border/60 px-4 py-3">
        <div />

        <div className="flex items-center justify-center gap-2">
          {live ? (
            <LiveKitMediaToggles room={props.room} />
          ) : (
            <PreviewMediaToggles media={props.media} />
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <StoreIdeasMenu onOpened={markStoreOpened} />
          {live ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={props.onEndShow}
              className="gap-1.5 border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
            >
              <Square className="size-3.5 fill-current" />
              End show
            </Button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}

function challengeStoreFromDraft(
  draft: ShowSetupDraft | null | undefined,
): ChallengeStore | null {
  if (!draft?.challengeStoreUrl) return null;
  return {
    url: draft.challengeStoreUrl,
    brandName: draft.challengeBrandName ?? "the store",
  };
}

function LiveBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-live-foreground">
      <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
      Live
    </span>
  );
}

/**
 * The permission moment. A denied prompt is not an error message the host can
 * act on by reading it, so the retry that re-asks the browser sits right here.
 */
function CameraGateAction({ media }: { media: MediaControls }) {
  if (media.requesting) {
    return (
      <p className="text-sm text-muted-foreground">
        Waiting for you to allow camera and microphone…
      </p>
    );
  }

  if (media.cameraError) {
    return (
      <div className="flex flex-col gap-2">
        <InlineError message={media.cameraError} />
        <Button
          type="button"
          variant="outline"
          className="w-fit gap-2"
          onClick={media.retry}
        >
          <Video className="size-4" />
          Allow camera and mic
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-fit gap-2"
      onClick={media.retry}
    >
      <Video className="size-4" />
      Turn on camera
    </Button>
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
        still live at /s/{slug}. Reconnect to keep hosting, or end it before
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

function LiveKitMediaToggles({ room }: { room: Room }) {
  return (
    <>
      <TrackToggle
        room={room}
        source={Track.Source.Microphone}
        onIcon={<Mic />}
        offIcon={<MicOff />}
        onLabel="Mute microphone"
        offLabel="Unmute microphone"
        event={AnalyticsEvent.HOST_MIC_TOGGLE}
      />
      <TrackToggle
        room={room}
        source={Track.Source.Camera}
        onIcon={<Video />}
        offIcon={<VideoOff />}
        onLabel="Turn camera off"
        offLabel="Turn camera on"
        event={AnalyticsEvent.HOST_CAMERA_TOGGLE}
      />
    </>
  );
}

function TrackToggle({
  room,
  source,
  onIcon,
  offIcon,
  onLabel,
  offLabel,
  event,
}: {
  room: Room;
  source: Track.Source.Microphone | Track.Source.Camera;
  onIcon: React.ReactNode;
  offIcon: React.ReactNode;
  onLabel: string;
  offLabel: string;
  event: (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];
}) {
  const { enabled, buttonProps } = useTrackToggle({ source, room });

  return (
    <BarToggle
      on={enabled}
      label={enabled ? onLabel : offLabel}
      icon={enabled ? onIcon : offIcon}
      onClick={(e) => {
        trackEvent(event, { area: "host_studio", enabled: !enabled });
        buttonProps.onClick?.(e);
      }}
    />
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
