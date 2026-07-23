"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  TrackToggle,
  VideoTrack,
  useChat,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import {
  ExternalLink,
  LogOut,
  Mic,
  MicOff,
  MonitorUp,
  Video,
  VideoOff,
} from "lucide-react";

import { ChatPanel } from "@/components/chat-panel";
import { EndLiveShowButton } from "@/components/end-live-show-button";
import { EndShowDialog } from "@/components/end-show-dialog";
import { ShareShowLinkButton } from "@/components/share-show-link-button";
import { StudioLayout } from "@/components/studio-layout";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Panel,
  PanelContent,
  PanelHeader,
  PanelTitle,
} from "@/components/ui/panel";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  MONITOR_ASIDE,
  MONITOR_CAMERA,
  MONITOR_SHARE,
  VideoFrame,
  VideoPlaceholder,
} from "@/components/video-placeholder";
import { ViewerCount } from "@/components/viewer-count";
import { useStreamState } from "@/lib/stream-state";
import { cn } from "@/lib/utils";

const STORE_LINKS = [
  { name: "Uniqlo", url: "https://www.uniqlo.com" },
  { name: "SSENSE", url: "https://www.ssense.com" },
  { name: "Sephora", url: "https://www.sephora.com" },
  { name: "REI", url: "https://www.rei.com" },
] as const;

type ShowSession = {
  slug: string;
  title: string;
  room: string;
  token: string;
  url: string;
};

type MediaControls = {
  stream: MediaStream | null;
  cameraOn: boolean;
  micOn: boolean;
  toggleCamera: () => void;
  toggleMic: () => void;
  cameraError: string | null;
  stop: () => void;
};

export default function HostClient({
  hostName,
  channel3Configured,
  resumeSlug,
  liveShowSlug,
  liveShowTitle,
}: {
  hostName: string | null;
  channel3Configured: boolean;
  resumeSlug?: string | null;
  liveShowSlug?: string | null;
  liveShowTitle?: string | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"preshow" | "live" | "disconnected">(
    "preshow",
  );
  const [session, setSession] = useState<ShowSession | null>(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liveStartedAt = useRef<number | null>(null);
  const media = useMediaPreview();
  const stopMediaRef = useRef(media.stop);
  useEffect(() => {
    stopMediaRef.current = media.stop;
  }, [media.stop]);

  const resumeShow = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shows/${slug}/resume`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to reconnect");

      stopMediaRef.current();
      if (!liveStartedAt.current) liveStartedAt.current = Date.now();
      setSession({
        slug: data.slug,
        title: data.title,
        room: data.room,
        token: data.token,
        url: data.url,
      });
      setPhase("live");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("preshow");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!resumeSlug) return;
    const timer = window.setTimeout(() => {
      void resumeShow(resumeSlug);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [resumeSlug, resumeShow]);

  async function goLive() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || "Untitled show",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && liveShowSlug) {
          throw new Error(
            "You already have a live show. Reconnect below or end it first.",
          );
        }
        throw new Error(data.error ?? "Failed to start show");
      }

      stopMediaRef.current();
      liveStartedAt.current = Date.now();
      setSession({
        slug: data.slug,
        title: data.title,
        room: data.room,
        token: data.token,
        url: data.url,
      });
      setPhase("live");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleShowEnded(slug: string) {
    setSession(null);
    setPhase("preshow");
    router.replace(`/host/${slug}`);
  }

  if (phase === "live" && session) {
    return (
      <LiveBroadcast
        session={session}
        channel3Configured={channel3Configured}
        onShowEnded={handleShowEnded}
        onDisconnected={() => setPhase("disconnected")}
      />
    );
  }

  if (phase === "disconnected" && session) {
    return (
      <DisconnectedPanel
        slug={session.slug}
        title={session.title}
        loading={loading}
        error={error}
        onReconnect={() => void resumeShow(session.slug)}
        onBack={() => {
          setSession(null);
          setPhase("preshow");
          setError(null);
        }}
        onShowEnded={() => {
          setSession(null);
          setPhase("preshow");
          setError(null);
          router.replace(`/host/${session.slug}`);
        }}
      />
    );
  }

  return (
    <Preshow
      title={title}
      onTitleChange={setTitle}
      onGoLive={goLive}
      loading={loading}
      error={error}
      media={media}
      liveShowSlug={liveShowSlug}
      liveShowTitle={liveShowTitle}
      onResumeLiveShow={
        liveShowSlug ? () => void resumeShow(liveShowSlug) : undefined
      }
      resumeLoading={loading}
    />
  );
}

function DisconnectedPanel({
  slug,
  title,
  loading,
  error,
  onReconnect,
  onBack,
  onShowEnded,
}: {
  slug: string;
  title: string;
  loading: boolean;
  error: string | null;
  onReconnect: () => void;
  onBack: () => void;
  onShowEnded: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-2xl font-normal tracking-tight">Connection lost</h1>
      <p className="text-sm text-muted-foreground">
        Your show <span className="text-foreground">{title}</span> is still live
        for viewers. Reconnect to continue hosting, or end the show below.
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button onClick={onReconnect} disabled={loading}>
          {loading ? "Reconnecting…" : "Reconnect"}
        </Button>
        <EndLiveShowButton
          slug={slug}
          title={title}
          onEnded={onShowEnded}
        />
        <Button variant="outline" render={<Link href={`/s/${slug}`} target="_blank" />}>
          Open viewer page
        </Button>
        <Button variant="ghost" onClick={onBack}>
          Back to studio
        </Button>
      </div>
    </main>
  );
}

function LiveBroadcast({
  session,
  channel3Configured,
  onShowEnded,
  onDisconnected,
}: {
  session: ShowSession;
  channel3Configured: boolean;
  onShowEnded: (slug: string) => void;
  onDisconnected: () => void;
}) {
  const recordingStarted = useRef(false);
  const [studioError, setStudioError] = useState<string | null>(null);

  function handleConnected() {
    if (recordingStarted.current) return;
    recordingStarted.current = true;
    void (async () => {
      try {
        const res = await fetch(`/api/shows/${session.slug}/recording`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to start recording");
        }
      } catch (err) {
        setStudioError(
          err instanceof Error ? err.message : "Failed to start recording",
        );
      }
    })();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {studioError ? (
        <div
          className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          {studioError}
        </div>
      ) : null}
      <LiveKitRoom
        token={session.token}
        serverUrl={session.url}
        connect
        video
        audio
        onConnected={handleConnected}
        onDisconnected={onDisconnected}
        className="flex min-h-0 flex-1 flex-col bg-background"
        data-lk-theme="retail"
      >
        <BroadcastStudio
          session={session}
          channel3Configured={channel3Configured}
          onShowEnded={onShowEnded}
          onStudioError={setStudioError}
        />
      </LiveKitRoom>
    </div>
  );
}

function BroadcastStudio({
  session,
  channel3Configured,
  onShowEnded,
  onStudioError,
}: {
  session: ShowSession;
  channel3Configured: boolean;
  onShowEnded: (slug: string) => void;
  onStudioError: (message: string | null) => void;
}) {
  const stream = useStreamState({ isHost: true });
  const room = useRoomContext();
  const participants = useParticipants();
  const { chatMessages } = useChat();
  const peakViewers = useRef(0);
  const peakChat = useRef(0);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endingStep, setEndingStep] = useState(0);
  const [endError, setEndError] = useState<string | null>(null);

  const viewerPath = `/s/${session.slug}`;

  useEffect(() => {
    const viewers = participants.filter(
      (p) => !p.permissions?.canPublish,
    ).length;
    if (viewers > peakViewers.current) peakViewers.current = viewers;
  }, [participants]);

  useEffect(() => {
    if (chatMessages.length > peakChat.current) {
      peakChat.current = chatMessages.length;
    }
  }, [chatMessages.length]);

  useEffect(() => {
    const id = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/shows/${session.slug}/snapshot`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ snapshot: stream.snapshot }),
          });
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error ?? "Failed to save snapshot");
          }
        } catch (err) {
          onStudioError(
            err instanceof Error ? err.message : "Failed to save snapshot",
          );
        }
      })();
    }, 30_000);
    return () => clearInterval(id);
  }, [onStudioError, session.slug, stream.snapshot]);

  const confirmEndShow = useCallback(async () => {
    setEnding(true);
    setEndingStep(0);
    setEndError(null);
    onStudioError(null);

    const snapshotWithStats = {
      ...stream.snapshot,
      stats: {
        peakViewers: peakViewers.current,
        chatCount: peakChat.current,
      },
    };

    try {
      const snapshotRes = await fetch(`/api/shows/${session.slug}/snapshot`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: snapshotWithStats }),
      });
      if (snapshotRes.ok) {
        setEndingStep(1);
      }

      const res = await fetch(`/api/shows/${session.slug}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot: snapshotWithStats }),
      });
      const data = (await res.json()) as { error?: string; status?: string };
      if (!res.ok || data.status !== "ended") {
        throw new Error(data.error ?? "Failed to end show");
      }
      setEndingStep(2);

      room.disconnect();
      setEndingStep(3);

      onShowEnded(session.slug);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to end show";
      setEndError(message);
      onStudioError(message);
      setEnding(false);
      setEndingStep(0);
    }
  }, [
    onShowEnded,
    onStudioError,
    room,
    session.slug,
    stream.snapshot,
  ]);

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-3">
        <span className="micro inline-flex shrink-0 items-center gap-2 text-live">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
          You&rsquo;re live
        </span>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <ShareShowLinkButton
            slug={session.slug}
            className="h-11 w-full text-base sm:w-auto"
            showPath
          />
          <div className="flex min-w-0 items-center justify-end gap-2 sm:gap-4">
            <ViewerCount />
            <Link
              href={viewerPath}
              target="_blank"
              aria-label="Open viewer page"
              className="micro inline-flex shrink-0 items-center gap-1 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline max-sm:rounded-md max-sm:border max-sm:border-border max-sm:p-2 max-sm:no-underline"
            >
              <span className="max-sm:sr-only">Open viewer page</span>
              <ExternalLink className="size-3.5 sm:size-3" />
            </Link>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setEndDialogOpen(true)}
                    aria-label="End show"
                    className="hidden border-live/40 text-live hover:bg-live hover:text-live-foreground sm:inline-flex"
                  >
                    <LogOut />
                  </Button>
                }
              />
              <TooltipContent>End show</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      <StudioLayout
        stream={stream}
        channel3Configured={channel3Configured}
        monitor={<ConfidenceMonitor onEndShow={() => setEndDialogOpen(true)} />}
        chat={<ChatPanel className="min-h-0 flex-1 ring-0 xl:min-h-64" />}
      />

      <EndShowDialog
        open={endDialogOpen}
        onOpenChange={(open) => {
          setEndDialogOpen(open);
          if (!open) setEndError(null);
        }}
        onConfirm={confirmEndShow}
        ending={ending}
        endingStep={endingStep}
        error={endError}
      />
    </>
  );
}

function ConfidenceMonitor({ onEndShow }: { onEndShow: () => void }) {
  const tracks = useTracks(
    [Track.Source.Camera, Track.Source.ScreenShare],
    { onlySubscribed: false },
  );
  const local = tracks.filter((t) => t.participant.isLocal);
  const camera = local.find((t) => t.source === Track.Source.Camera);
  const share = local.find((t) => t.source === Track.Source.ScreenShare);

  return (
    <aside className={MONITOR_ASIDE}>
      <div className="flex flex-col gap-3 max-lg:gap-2">
        <div className="flex flex-col gap-3 max-lg:flex-row max-lg:items-stretch max-lg:gap-2">
        <VideoFrame label="You" className={MONITOR_CAMERA}>
          {camera ? (
            <VideoTrack
              trackRef={camera}
              className="h-full w-full object-cover"
            />
          ) : (
            <VideoPlaceholder>Camera off</VideoPlaceholder>
          )}
        </VideoFrame>

        <VideoFrame label="On screen" className={MONITOR_SHARE}>
          {share ? (
            <VideoTrack
              trackRef={share}
              className="h-full w-full object-contain"
            />
          ) : (
            <VideoPlaceholder>Not sharing</VideoPlaceholder>
          )}
        </VideoFrame>
        </div>
      </div>

      <StudioControlBar sharing={Boolean(share)} onEndShow={onEndShow} />
    </aside>
  );
}

function StudioControlBar({
  sharing,
  onEndShow,
}: {
  sharing: boolean;
  onEndShow: () => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 max-lg:gap-0.5 sm:gap-1.5">
      <ToggleControl
        source={Track.Source.Microphone}
        label="Microphone"
        on={<Mic />}
        off={<MicOff />}
      />
      <ToggleControl
        source={Track.Source.Camera}
        label="Camera"
        on={<Video />}
        off={<VideoOff />}
      />
      <ToggleControl
        source={Track.Source.ScreenShare}
        label={sharing ? "Stop sharing" : "Share screen"}
        on={<MonitorUp />}
        off={<MonitorUp />}
      />

      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              aria-label="End show"
              onClick={onEndShow}
              className={cn(
                buttonVariants({ variant: "outline", size: "icon" }),
                "ml-1 border-live/40 text-live hover:bg-live hover:text-live-foreground",
              )}
            >
              <LogOut />
            </Button>
          }
        />
        <TooltipContent>End show</TooltipContent>
      </Tooltip>
    </div>
  );
}

function ToggleControl({
  source,
  label,
  on,
  off,
}: {
  source: Track.Source.Microphone | Track.Source.Camera | Track.Source.ScreenShare;
  label: string;
  on: React.ReactNode;
  off: React.ReactNode;
}) {
  const [enabled, setEnabled] = useState(source !== Track.Source.ScreenShare);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <TrackToggle
            source={source}
            showIcon={false}
            onChange={setEnabled}
            aria-label={label}
            className={cn(
              buttonVariants({
                variant: enabled ? "secondary" : "outline",
                size: "icon",
              }),
              !enabled && "text-muted-foreground",
            )}
          >
            {enabled ? on : off}
          </TrackToggle>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Preshow({
  title,
  onTitleChange,
  onGoLive,
  loading,
  error,
  media,
  liveShowSlug,
  liveShowTitle,
  onResumeLiveShow,
  resumeLoading,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  onGoLive: () => void;
  loading: boolean;
  error: string | null;
  media: MediaControls;
  liveShowSlug?: string | null;
  liveShowTitle?: string | null;
  onResumeLiveShow?: () => void;
  resumeLoading?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { cameraOn, micOn, toggleCamera, toggleMic, cameraError } = media;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:gap-10 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-4">
        {liveShowSlug ? (
          <div className="flex flex-col gap-3 rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/8">
            <div className="flex flex-col gap-1">
              <span className="micro inline-flex items-center gap-2 text-live">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
                Show still live
              </span>
              <p className="text-sm text-muted-foreground">
                {liveShowTitle ? (
                  <>
                    <span className="text-foreground">{liveShowTitle}</span> is
                    still live at /s/{liveShowSlug}. Reconnect to keep hosting,
                    or end it before starting a new one.
                  </>
                ) : (
                  <>
                    You still have a live show at /s/{liveShowSlug}. Reconnect
                    to keep hosting, or end it before starting a new one.
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

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <h1 className="text-xl font-medium tracking-tight text-foreground sm:text-2xl">
            Prep your show
          </h1>
          <Button
            onClick={onGoLive}
            disabled={loading || Boolean(liveShowSlug)}
            title={
              liveShowSlug
                ? "End your current live show before starting another"
                : "Creates a shareable show and starts recording automatically"
            }
            className="w-full shrink-0 bg-live text-live-foreground hover:bg-live/90 sm:w-fit"
          >
            {loading ? "Starting…" : "Go live"}
          </Button>
        </div>

        {liveShowSlug ? (
          <ShareShowLinkButton
            slug={liveShowSlug}
            className="h-11 w-full text-base sm:max-w-md"
            showPath
          />
        ) : null}

        <div className="flex max-w-md flex-col gap-2">
          <Input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled show"
            aria-label="Show title"
          />
          <p className="text-sm text-muted-foreground">
            {liveShowSlug
              ? "Share the link above so viewers can join before you reconnect."
              : "Your share link unlocks as soon as you go live."}
          </p>
        </div>
      </header>

      {error ? (
        <p className="-mt-4 border-l-2 border-destructive py-1 pl-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel>
          <PanelHeader>
            <PanelTitle>Camera &amp; mic</PanelTitle>
          </PanelHeader>
          <PanelContent className="flex flex-col gap-4">
            <VideoFrame label="You" className="aspect-video w-full">
              <CameraPreview media={media} videoRef={videoRef} />
            </VideoFrame>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                <Button
                  type="button"
                  variant={cameraOn ? "secondary" : "outline"}
                  size="sm"
                  onClick={toggleCamera}
                  disabled={!media.stream}
                  className="w-full sm:w-auto"
                >
                  {cameraOn ? <Video /> : <VideoOff />}
                  <span className="hidden sm:inline">
                    {cameraOn ? "Camera on" : "Camera off"}
                  </span>
                  <span className="sm:hidden">{cameraOn ? "Cam" : "Cam off"}</span>
                </Button>
                <Button
                  type="button"
                  variant={micOn ? "secondary" : "outline"}
                  size="sm"
                  onClick={toggleMic}
                  disabled={!media.stream}
                  className="w-full sm:w-auto"
                >
                  {micOn ? <Mic /> : <MicOff />}
                  <span className="hidden sm:inline">
                    {micOn ? "Mic on" : "Mic off"}
                  </span>
                  <span className="sm:hidden">{micOn ? "Mic" : "Mic off"}</span>
                </Button>
              </div>
              <span className="micro inline-flex items-center gap-1.5 text-muted-foreground">
                <MonitorUp className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">
                  Screen share starts after you go live
                </span>
                <span className="sm:hidden">Share after going live</span>
              </span>
            </div>

            {cameraError ? (
              <p className="border-l-2 border-destructive py-1 pl-3 text-sm text-destructive">
                {cameraError}
              </p>
            ) : null}
          </PanelContent>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>Store links</PanelTitle>
          </PanelHeader>
          <PanelContent>
            <ul className="flex flex-col gap-2">
              {STORE_LINKS.map((store) => (
                <li key={store.url}>
                  <a
                    href={store.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "w-full justify-between",
                    )}
                  >
                    {store.name}
                    <ExternalLink className="size-3.5 text-foreground/60" />
                  </a>
                </li>
              ))}
            </ul>
          </PanelContent>
        </Panel>
      </div>
    </main>
  );
}

function useMediaPreview(): MediaControls {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let alive = true;

    async function startPreview() {
      setCameraError(null);
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!alive) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = media;
        setStream(media);
        setCameraOn(true);
        setMicOn(true);
      } catch {
        if (alive) {
          setCameraError(
            "Couldn\u2019t access camera or microphone. Check browser permissions, then try again.",
          );
        }
      }
    }

    startPreview();

    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setCameraOn(false);
    };
  }, []);

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setStream(null);
    setCameraOn(false);
  }

  function toggleCamera() {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  }

  function toggleMic() {
    if (!streamRef.current) return;
    const track = streamRef.current.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  return { stream, cameraOn, micOn, toggleCamera, toggleMic, cameraError, stop };
}

function CameraPreview({
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
