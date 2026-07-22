"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ExternalLink,
  LogOut,
  Mic,
  MicOff,
  MonitorUp,
  Video,
  VideoOff,
} from "lucide-react";

import { ChatPanelView, type ChatLine } from "@/components/chat-panel";
import { ENDING_STEPS, EndShowDialog } from "@/components/end-show-dialog";
import { ShowEndedCreator } from "@/components/show-ended-creator";
import { StudioLayout } from "@/components/studio-layout";
import {
  MONITOR_ASIDE,
  MONITOR_CAMERA,
  MONITOR_SHARE,
  VideoFrame,
  VideoPlaceholder,
} from "@/components/video-placeholder";
import { ViewerCountView } from "@/components/viewer-count";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { getMockShow } from "@/lib/mock-home-data";
import {
  MOCK_CHAT,
  MOCK_SNAPSHOT,
  MOCK_VIEWER_COUNT,
  resolveMockProduct,
} from "@/lib/mock-data";
import {
  clearShowEnded,
  markShowEnded,
  type EndedShowRecap,
} from "@/lib/mock-show-status";
import { useMockStreamState } from "@/lib/mock-stream-state";
import { cn } from "@/lib/utils";

const MOCK_SHOW_SLUG = "winter-layers";
const MOCK_SHOW = getMockShow(MOCK_SHOW_SLUG)!;

const STORE_LINKS = [
  { name: "Uniqlo", url: "https://www.uniqlo.com" },
  { name: "SSENSE", url: "https://www.ssense.com" },
  { name: "Sephora", url: "https://www.sephora.com" },
  { name: "REI", url: "https://www.rei.com" },
] as const;

const PRESHOW_TIPS = [
  "Open each store in a new browser tab before you go live — you\u2019ll paste product URLs from there.",
  "Open the viewer page in a separate window so you can see what your audience sees.",
  "Check your camera and mic here first. Screen share starts once you\u2019re live.",
] as const;

type MediaControls = {
  stream: MediaStream | null;
  cameraOn: boolean;
  micOn: boolean;
  toggleCamera: () => void;
  toggleMic: () => void;
  cameraError: string | null;
};

export default function GoLiveClient() {
  const [phase, setPhase] = useState<"preshow" | "live" | "ended">("preshow");
  const stream = useMockStreamState(MOCK_SNAPSHOT);
  const [messages, setMessages] = useState<ChatLine[]>(MOCK_CHAT);
  const [recap, setRecap] = useState<EndedShowRecap | null>(null);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endingStep, setEndingStep] = useState(0);
  const liveStartedAt = useRef<number | null>(null);
  const media = useMediaPreview();

  const send = useCallback((message: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${prev.length}`,
        timestamp: Date.now(),
        message,
        from: { name: "You (host)" },
      },
    ]);
  }, []);

  function goLive() {
    clearShowEnded(MOCK_SHOW_SLUG);
    liveStartedAt.current = Date.now();
    setPhase("live");
  }

  function requestEndShow() {
    setEndDialogOpen(true);
  }

  async function confirmEndShow() {
    setEnding(true);
    setEndingStep(0);

    for (let i = 0; i < ENDING_STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 700));
      setEndingStep(i + 1);
    }

    const ended: EndedShowRecap = {
      slug: MOCK_SHOW_SLUG,
      title: MOCK_SHOW.title,
      host: MOCK_SHOW.host,
      thumbnailUrl: MOCK_SHOW.thumbnailUrl,
      endedAt: Date.now(),
      peakViewers: MOCK_VIEWER_COUNT,
      chatCount: messages.length,
      durationMs: liveStartedAt.current
        ? Date.now() - liveStartedAt.current
        : 45 * 60_000,
      snapshot: stream.snapshot,
    };

    markShowEnded(ended);
    setRecap(ended);
    setEnding(false);
    setEndDialogOpen(false);
    setPhase("ended");
  }

  function startNewShow() {
    clearShowEnded(MOCK_SHOW_SLUG);
    setRecap(null);
    setMessages(MOCK_CHAT);
    liveStartedAt.current = null;
    setPhase("preshow");
  }

  if (phase === "ended" && recap) {
    return <ShowEndedCreator recap={recap} onStartNew={startNewShow} />;
  }

  if (phase === "live") {
    return (
      <>
        <LiveStudio
          stream={stream}
          messages={messages}
          onSend={send}
          onEnd={requestEndShow}
          media={media}
        />
        <EndShowDialog
          open={endDialogOpen}
          onOpenChange={setEndDialogOpen}
          onConfirm={confirmEndShow}
          ending={ending}
          endingStep={endingStep}
        />
      </>
    );
  }

  return <Preshow onGoLive={goLive} media={media} />;
}

/** Camera + mic preview shared between preshow and the live confidence monitor. */
function useMediaPreview(): MediaControls {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let media: MediaStream | null = null;

    async function startPreview() {
      setCameraError(null);
      try {
        media = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        if (!alive) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
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
      media?.getTracks().forEach((track) => track.stop());
      setStream(null);
      setCameraOn(false);
    };
  }, []);

  function toggleCamera() {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCameraOn(track.enabled);
  }

  function toggleMic() {
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
  }

  return { stream, cameraOn, micOn, toggleCamera, toggleMic, cameraError };
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

function MediaControlBar({
  media,
  sharing = false,
}: {
  media: MediaControls;
  sharing?: boolean;
}) {
  const { stream, cameraOn, micOn, toggleCamera, toggleMic } = media;

  return (
    <div className="flex items-center justify-center gap-1.5">
      <ControlButton
        label={micOn ? "Microphone on" : "Microphone off"}
        active={micOn}
        onClick={toggleMic}
        disabled={!stream}
      >
        {micOn ? <Mic /> : <MicOff />}
      </ControlButton>
      <ControlButton
        label={cameraOn ? "Camera on" : "Camera off"}
        active={cameraOn}
        onClick={toggleCamera}
        disabled={!stream}
      >
        {cameraOn ? <Video /> : <VideoOff />}
      </ControlButton>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled
              aria-label={sharing ? "Stop sharing" : "Share screen"}
              className="text-muted-foreground"
            >
              <MonitorUp />
            </Button>
          }
        />
        <TooltipContent>
          Screen share is stubbed in this proto — use /host for real controls
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function ControlButton({
  label,
  active,
  onClick,
  disabled,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={active ? "secondary" : "outline"}
            size="icon"
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            aria-pressed={active}
            className={cn(!active && "text-muted-foreground")}
          >
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Preshow({
  onGoLive,
  media,
}: {
  onGoLive: () => void;
  media: MediaControls;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { cameraOn, micOn, toggleCamera, toggleMic, cameraError } = media;
  const viewerPath = `/ui-proto/show/${MOCK_SHOW_SLUG}`;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-6 py-8">
      <header className="flex flex-col gap-3">
        <span className="micro text-muted-foreground">Show creator</span>
        <h1 className="text-2xl font-normal tracking-tight">Prep your show</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Set up your camera, open the stores you&rsquo;ll shop from, and preview
          the viewer page — then go live when you&rsquo;re ready.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel>
          <PanelHeader>
            <PanelTitle>Camera &amp; mic</PanelTitle>
          </PanelHeader>
          <PanelContent className="flex flex-col gap-4">
            <VideoFrame label="You" className="aspect-video w-full">
              <CameraPreview media={media} videoRef={videoRef} />
            </VideoFrame>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={cameraOn ? "secondary" : "outline"}
                size="sm"
                onClick={toggleCamera}
                disabled={!media.stream}
              >
                {cameraOn ? <Video /> : <VideoOff />}
                {cameraOn ? "Camera on" : "Camera off"}
              </Button>
              <Button
                type="button"
                variant={micOn ? "secondary" : "outline"}
                size="sm"
                onClick={toggleMic}
                disabled={!media.stream}
              >
                {micOn ? <Mic /> : <MicOff />}
                {micOn ? "Mic on" : "Mic off"}
              </Button>
              <span className="micro inline-flex items-center gap-1.5 text-muted-foreground">
                <MonitorUp className="size-3.5" />
                Screen share starts after you go live
              </span>
            </div>

            {cameraError ? (
              <p className="border-l-2 border-destructive py-1 pl-3 text-sm text-destructive">
                {cameraError}
              </p>
            ) : null}
          </PanelContent>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel>
            <PanelHeader>
              <PanelTitle>Store links</PanelTitle>
            </PanelHeader>
            <PanelContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Open these in new tabs so you can grab product URLs while you&rsquo;re
                live.
              </p>
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
                      <ExternalLink className="size-3.5 text-muted-foreground" />
                    </a>
                  </li>
                ))}
              </ul>
            </PanelContent>
          </Panel>

          <Panel>
            <PanelHeader>
              <PanelTitle>Before you go live</PanelTitle>
            </PanelHeader>
            <PanelContent className="flex flex-col gap-4">
              <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
                {PRESHOW_TIPS.map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/50" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-2 border-t border-border pt-4">
                <span className="micro text-muted-foreground">Viewer preview</span>
                <Link
                  href={viewerPath}
                  target="_blank"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "justify-between text-foreground",
                  )}
                >
                  Open viewer page
                  <ExternalLink className="size-3.5 text-muted-foreground" />
                </Link>
                <code className="micro truncate font-mono text-muted-foreground">
                  {viewerPath}
                </code>
              </div>
            </PanelContent>
          </Panel>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Mock broadcast — no LiveKit room. Pin products and chat work locally.
        </p>
        <Button
          size="micro"
          onClick={onGoLive}
          className="w-fit bg-live text-live-foreground hover:bg-live/90"
        >
          Go live
        </Button>
      </div>
    </main>
  );
}

/** Creator studio while live — same layout as /prototype and /host. */
function LiveStudio({
  stream,
  messages,
  onSend,
  onEnd,
  media,
}: {
  stream: ReturnType<typeof useMockStreamState>;
  messages: ChatLine[];
  onSend: (message: string) => void;
  onEnd: () => void;
  media: MediaControls;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewerPath = `/ui-proto/show/${MOCK_SHOW_SLUG}`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-3">
        <span className="micro inline-flex items-center gap-2 text-live">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-live" />
          You&rsquo;re live
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <ViewerCountView count={MOCK_VIEWER_COUNT} />
          <Link
            href={viewerPath}
            target="_blank"
            className="micro inline-flex items-center gap-1 text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Open viewer page
            <ExternalLink className="size-3" />
          </Link>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onEnd}
                  aria-label="End show"
                  className="border-live/40 text-live hover:bg-live hover:text-live-foreground"
                >
                  <LogOut />
                </Button>
              }
            />
            <TooltipContent>End show</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <StudioLayout
        stream={stream}
        onResolveProduct={resolveMockProduct}
        monitor={
          <aside className={MONITOR_ASIDE}>
            <div className="flex flex-col gap-3">
              <VideoFrame label="You" className={MONITOR_CAMERA}>
                <CameraPreview media={media} videoRef={videoRef} />
              </VideoFrame>
              <VideoFrame label="On screen" className={MONITOR_SHARE}>
                <VideoPlaceholder>Not sharing</VideoPlaceholder>
              </VideoFrame>
            </div>
            <MediaControlBar media={media} />
          </aside>
        }
        chat={
          <ChatPanelView
            messages={messages}
            onSend={onSend}
            className="min-h-64 flex-1 xl:w-80 xl:flex-none"
          />
        }
      />
    </div>
  );
}
