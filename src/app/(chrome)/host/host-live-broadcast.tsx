"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import { ExternalLink, Square } from "lucide-react";

import {
  LiveBridgeProvider,
  LiveRoom,
  VideoTrack,
  useChat,
  useLiveBridge,
  useParticipants,
  useRoomContext,
  useTracks,
} from "@/lib/live";

import { ChatPanel } from "@/components/chat-panel";
import { EndShowDialog } from "@/components/end-show-dialog";
import { FaceBubble } from "@/components/face-bubble";
import { HostControlBar } from "@/components/host-control-bar";
import { HostFloatingStudio } from "@/components/host-floating-studio";
import { PipStoreSuggestions } from "@/components/pip-store-suggestions";
import { PollComposer } from "@/components/poll-composer";
import { PollLaunchButton, PollOverlay } from "@/components/poll-overlay";
import { HostLaunchScreen } from "@/components/host-launch-screen";
import { ShareShowLinkButton } from "@/components/share-show-link-button";
import { ShareSurfaceBanner } from "@/components/share-surface-banner";
import { StudioLayout } from "@/components/studio-layout";
import { HostStageOverlays } from "@/components/watch-layout";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDocumentPiP } from "@/hooks/use-document-pip";
import { readResponseJson } from "@/lib/fetch-json";
import {
  clearLiveShare,
  publishLiveShare,
} from "@/lib/live-share-channel";
import { mountPipApp, unmountPipApp } from "@/lib/pip-react-root";
import {
  getShareDisplaySurface,
  type ShareDisplaySurface,
} from "@/lib/screen-share-surface";
import { usePollState } from "@/lib/poll-state";
import type { StreamSnapshot } from "@/lib/stream-store";
import { useStreamState } from "@/lib/stream-state";
import {
  HOST_CAMERA_BUBBLE,
  HOST_CONTROL_BAR,
  HOST_CONTROL_BAR_INNER,
  HOST_STAGE,
  VideoPlaceholder,
} from "@/components/video-placeholder";
import { ViewerCount } from "@/components/viewer-count";
import { cn } from "@/lib/utils";

export type ShowSession = {
  slug: string;
  title: string;
  room: string;
  token: string;
  url: string;
  snapshot?: StreamSnapshot;
};

export default function LiveBroadcast({
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
          const data = await readResponseJson<{ error?: string }>(res);
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
    <div className="flex min-h-0 flex-1 flex-col lg:min-h-[calc(100vh-4.5rem)]">
      {studioError ? (
        <div
          className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive"
          role="alert"
        >
          {studioError}
        </div>
      ) : null}
      <LiveRoom
        token={session.token}
        serverUrl={session.url}
        video
        audio
        onConnected={handleConnected}
        onDisconnected={onDisconnected}
        localRole="host"
        localSlug={session.slug}
        className="flex min-h-0 flex-1 flex-col bg-background"
      >
        <BroadcastStudio
          session={session}
          channel3Configured={channel3Configured}
          onShowEnded={onShowEnded}
          onStudioError={setStudioError}
        />
      </LiveRoom>
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
  const stream = useStreamState({
    isHost: true,
    initialSnapshot: session.snapshot,
  });
  const room = useRoomContext();
  const bridge = useLiveBridge();
  const participants = useParticipants();
  const { chatMessages } = useChat();
  const peakViewers = useRef(0);
  const peakChat = useRef(0);
  const [endDialogOpen, setEndDialogOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endingStep, setEndingStep] = useState(0);
  const [endError, setEndError] = useState<string | null>(null);

  const {
    isSupported: pipSupported,
    isOpen: pipIsOpen,
    pipWindow,
    open: openPip,
    close: closePip,
  } = useDocumentPiP();
  const wasSharingRef = useRef(false);
  const [shareSurface, setShareSurface] = useState<
    ShareDisplaySurface | undefined
  >();
  const shareTracks = useTracks([Track.Source.ScreenShare], {
    onlySubscribed: false,
  });
  const sharing = shareTracks.some(
    (t) => t.participant.isLocal && t.source === Track.Source.ScreenShare,
  );
  const localShareTrack = shareTracks.find(
    (t) => t.participant.isLocal && t.source === Track.Source.ScreenShare,
  );

  const viewerPath = `/s/${session.slug}`;

  useEffect(() => {
    const mediaTrack =
      localShareTrack?.publication?.track?.mediaStreamTrack ?? null;

    async function syncShareState() {
      let captureHandle: string | null = null;
      if (mediaTrack && sharing) {
        try {
          const handle = await mediaTrack.getCaptureHandle?.();
          captureHandle = handle?.handle ?? null;
        } catch {
          captureHandle = null;
        }
      }

      publishLiveShare({
        slug: session.slug,
        live: true,
        sharing,
        captureHandle,
        surfaceLabel: mediaTrack?.label ?? null,
      });
    }

    void syncShareState();

    if (!mediaTrack) return;

    function onCaptureHandleChange() {
      void syncShareState();
    }

    mediaTrack.addEventListener?.("capturehandlechange", onCaptureHandleChange);
    return () => {
      mediaTrack.removeEventListener?.(
        "capturehandlechange",
        onCaptureHandleChange,
      );
    };
  }, [localShareTrack, session.slug, sharing]);

  useEffect(() => {
    const mediaTrack =
      localShareTrack?.publication?.track?.mediaStreamTrack ?? null;
    if (!mediaTrack || !sharing) {
      setShareSurface(undefined);
      return;
    }
    setShareSurface(getShareDisplaySurface(mediaTrack));
  }, [localShareTrack, sharing]);

  const reshareWindow = useCallback(async () => {
    await room.localParticipant.setScreenShareEnabled(false);
    await room.localParticipant.setScreenShareEnabled(true, {
      video: { displaySurface: "window" },
    });
  }, [room]);

  useEffect(() => {
    void navigator.mediaDevices?.setCaptureHandleConfig?.({
      handle: session.slug,
    });

    return () => {
      clearLiveShare();
      void navigator.mediaDevices?.setCaptureHandleConfig?.({ handle: "" });
    };
  }, [session.slug]);

  const openFloatingStudio = useCallback(async () => {
    await openPip({ width: 400, height: 720 });
  }, [openPip]);

  const handleEndShow = useCallback(() => {
    setEndDialogOpen(true);
  }, []);

  const confirmEndShow = useCallback(async () => {
    closePip();
    clearLiveShare();
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
      const data = await readResponseJson<{ error?: string; status?: string }>(
        res,
      );
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
    closePip,
    room,
    session.slug,
    stream.snapshot,
  ]);

  useEffect(() => {
    if (wasSharingRef.current && !sharing && pipIsOpen) {
      closePip();
    }
    wasSharingRef.current = sharing;
  }, [sharing, pipIsOpen, closePip]);

  useEffect(() => {
    if (!pipIsOpen || !pipWindow) return;
    return () => unmountPipApp(pipWindow);
  }, [pipIsOpen, pipWindow]);

  useEffect(() => {
    if (!pipIsOpen || !pipWindow) return;

    mountPipApp(
      pipWindow,
      <LiveBridgeProvider bridge={bridge}>
        <HostFloatingStudio
          room={room}
          stream={stream}
          sharing={sharing}
          chatCount={chatMessages.length}
          channel3Configured={channel3Configured}
          onEndShow={handleEndShow}
          onBeforeShare={openFloatingStudio}
          pipSupported={pipSupported}
          endDialogOpen={endDialogOpen}
          onEndDialogOpenChange={(open) => {
            setEndDialogOpen(open);
            if (!open) setEndError(null);
          }}
          onConfirmEndShow={confirmEndShow}
          ending={ending}
          endingStep={endingStep}
          endError={endError}
        />
      </LiveBridgeProvider>,
    );
  }, [
    pipIsOpen,
    pipWindow,
    bridge,
    room,
    stream,
    sharing,
    chatMessages.length,
    channel3Configured,
    handleEndShow,
    openFloatingStudio,
    pipSupported,
    endDialogOpen,
    confirmEndShow,
    ending,
    endingStep,
    endError,
  ]);

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

  // Checkpoint the shopping state so a crashed tab still leaves a recap.
  //
  // The snapshot is read through a ref rather than listed as a dependency:
  // every pin, note and vote produces a new snapshot object, and depending on
  // it would tear down and recreate the interval each time — restarting the
  // 30s clock so the autosave never fired during exactly the busy shows that
  // most need it.
  const snapshotRef = useRef(stream.snapshot);
  useEffect(() => {
    snapshotRef.current = stream.snapshot;
  }, [stream.snapshot]);

  useEffect(() => {
    const id = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/shows/${session.slug}/snapshot`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ snapshot: snapshotRef.current }),
          });
          if (!res.ok) {
            const data = await readResponseJson<{ error?: string }>(res);
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
  }, [onStudioError, session.slug]);

  return (
    <>
      {sharing && pipIsOpen ? (
        <ConnectionKeeper slug={session.slug} pipSupported={pipSupported} />
      ) : !sharing ? (
        <HostLaunchScreen
          live
          slug={session.slug}
          title={session.title}
          room={room}
          sharing={sharing}
          onEndShow={handleEndShow}
          onBeforeShare={openFloatingStudio}
          pipSupported={pipSupported}
        />
      ) : (
        <>
          <ShareSurfaceBanner
            surface={shareSurface}
            onReshare={
              shareSurface === "browser" ? () => void reshareWindow() : undefined
            }
          />
          <StudioLayout
          stream={stream}
          channel3Configured={channel3Configured}
          chatCount={chatMessages.length}
          stage={
            <HostStage
              slug={session.slug}
              viewerPath={viewerPath}
              sharing={sharing}
              onEndShow={handleEndShow}
              onBeforeShare={openFloatingStudio}
              pipSupported={pipSupported}
            />
          }
          chat={<ChatPanel variant="rail" className="min-h-0 flex-1" />}
        />
        </>
      )}

      {!(sharing && pipIsOpen) ? (
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
      ) : null}
    </>
  );
}

function ConnectionKeeper({
  slug,
  pipSupported,
}: {
  slug: string;
  pipSupported: boolean;
}) {
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
      <div className="flex w-full max-w-xl flex-col items-center gap-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-3 py-1 text-xs font-semibold uppercase tracking-wide text-live-foreground">
          <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
          Live
        </span>
        <h1 className="text-xl font-medium tracking-tight text-foreground">
          You&apos;re live
        </h1>
        <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
          {pipSupported
            ? "Controls are in the floating window. Share the store window so viewers follow along."
            : "Controls stay on this page while you share. Use Chrome for a floating control window while sharing."}
        </p>
      </div>

      <PipStoreSuggestions className="max-w-xl" />

      <ShareShowLinkButton slug={slug} showPath className="max-w-xl" />
      <p className="micro max-w-xl text-center text-muted-foreground">
        Keep this tab open to stay connected — closing or leaving this page ends
        the show for viewers.
        {pipSupported
          ? " Close the floating window to return controls here."
          : null}
      </p>
    </main>
  );
}

function HostStage({
  slug,
  viewerPath,
  sharing,
  onEndShow,
  onBeforeShare,
  pipSupported,
}: {
  slug: string;
  viewerPath: string;
  sharing: boolean;
  onEndShow: () => void;
  onBeforeShare?: () => void | Promise<void>;
  pipSupported: boolean;
}) {
  const [pollComposerOpen, setPollComposerOpen] = useState(false);
  const poll = usePollState({ isHost: true });

  const tracks = useTracks(
    [Track.Source.ScreenShare, Track.Source.Camera],
    { onlySubscribed: false },
  );
  const local = tracks.filter((t) => t.participant.isLocal);
  const share = local.find((t) => t.source === Track.Source.ScreenShare);
  const camera = local.find((t) => t.source === Track.Source.Camera);

  return (
    <div className={cn(HOST_STAGE, "max-lg:min-h-[50vh]")}>
      {!share ? (
        <VideoPlaceholder>Share your screen to start</VideoPlaceholder>
      ) : (
        <div className="relative h-full w-full">
          <VideoTrack
            trackRef={share}
            className="h-full w-full object-contain"
          />
          {camera && <FaceBubble trackRef={camera} className={HOST_CAMERA_BUBBLE} />}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 via-black/30 to-transparent p-3 sm:p-4">
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-live-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
            Live
          </span>
          <ViewerCount className="rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur-sm [&_span:first-child]:bg-live" />
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <PollLaunchButton onClick={() => setPollComposerOpen(true)} />
          <ShareShowLinkButton
            slug={slug}
            compact
            className="hidden sm:inline-flex"
          />
          <Link
            href={viewerPath}
            target="_blank"
            aria-label="Open viewer page"
            className="inline-flex size-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <ExternalLink className="size-4" />
          </Link>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onEndShow}
                  aria-label="End show"
                  className="size-9 rounded-full border border-destructive/50 bg-black/50 text-destructive backdrop-blur-sm hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Square className="size-4 fill-current" />
                </Button>
              }
            />
            <TooltipContent>End show</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <HostStageOverlays />

      {poll.poll && (
        <PollOverlay
          poll={poll.poll}
          myVote={poll.myVote}
          role="creator"
          onDismiss={poll.dismiss}
          onNewVote={() => {
            poll.dismiss();
            setPollComposerOpen(true);
          }}
        />
      )}

      <PollComposer
        open={pollComposerOpen}
        onOpenChange={setPollComposerOpen}
        onLaunch={poll.start}
      />

      <div className="pointer-events-auto absolute inset-x-3 top-14 z-10 sm:hidden">
        <ShareShowLinkButton slug={slug} compact className="w-full" />
      </div>

      <div className={HOST_CONTROL_BAR}>
        <div className={HOST_CONTROL_BAR_INNER}>
          <HostControlBar
            sharing={sharing}
            onEndShow={onEndShow}
            onBeforeShare={onBeforeShare}
            pipSupported={pipSupported}
            variant="stage"
          />
        </div>
      </div>
    </div>
  );
}
