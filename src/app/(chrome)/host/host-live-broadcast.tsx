"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Track } from "livekit-client";
import "@livekit/components-styles";
import {
  ExternalLink,
  PictureInPicture,
  PictureInPicture2,
  Square,
} from "lucide-react";

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
import { PollComposer } from "@/components/poll-composer";
import { PollLaunchButton, PollOverlay } from "@/components/poll-overlay";
import { HostLaunchScreen } from "@/components/host-launch-screen";
import { ShareShowLinkButton } from "@/components/share-show-link-button";
import { ShareSurfaceBanner } from "@/components/share-surface-banner";
import { StudioLayout } from "@/components/studio-layout";
import type { ChallengeStore } from "@/components/store-launcher";
import { HostStageOverlays } from "@/components/watch-layout";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAutoPip } from "@/hooks/use-auto-pip";
import { useDocumentPiP } from "@/hooks/use-document-pip";
import { useWindowPresence } from "@/hooks/use-window-presence";
import { readResponseJson } from "@/lib/fetch-json";
import { pipDebug } from "@/lib/pip-debug";
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
  challengeStore,
  onShowEnded,
  onDisconnected,
}: {
  session: ShowSession;
  channel3Configured: boolean;
  challengeStore?: ChallengeStore | null;
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
    // `data-hide-site-chrome` tells the (chrome) layout to drop the header and
    // footer while we're live — the studio is full-bleed like /watch, but it's
    // a phase of /host rather than its own route, so it can't opt out by living
    // outside the route group. See globals.css.
    <div
      data-hide-site-chrome
      className="flex min-h-0 flex-1 flex-col lg:min-h-dvh"
    >
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
          challengeStore={challengeStore}
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
  challengeStore,
  onShowEnded,
  onStudioError,
}: {
  session: ShowSession;
  channel3Configured: boolean;
  challengeStore?: ChallengeStore | null;
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

  const openFloatingStudio = useCallback(async () => {
    await openPip({ width: 400, height: 720 });
  }, [openPip]);

  const handleEndShow = useCallback(() => {
    setEndDialogOpen(true);
  }, []);

  const confirmEndShow = useCallback(async () => {
    closePip();
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

  // The floating studio's visibility is a pure function of one thing: whether
  // this tab is the window the host is looking at. On it, this tab is already
  // the confidence monitor and a pop-over would just duplicate it; away from it,
  // the pop-over is the only studio they can see.
  //
  // Chrome opens it (see useAutoPip); we close it. `armed` is what stops a
  // manual "Pop out" — clicked while the host is right here — from closing
  // itself in the same breath: a hand-opened window only becomes closeable once
  // the host has actually left the tab at least once. A Chrome-opened one is
  // armed from birth, so a quick flick away and back doesn't strand it on
  // screen.
  const autoOpenedRef = useRef(false);

  useAutoPip({
    enabled: sharing && pipSupported,
    onEnter: () => {
      autoOpenedRef.current = true;
      void openFloatingStudio().catch(() => {
        autoOpenedRef.current = false;
      });
    },
  });

  // Second, best-effort trigger. Chrome only hands us the action above once the
  // tab is genuinely hidden or occluded — a store window that sits beside this
  // one rather than over it leaves the tab "visible", so nothing fires. Blur
  // catches that case, but only when the host's last click here is still inside
  // Chrome's ~5s activation window; outside it requestWindow is rejected and
  // this costs nothing.
  useEffect(() => {
    if (!sharing || !pipSupported || pipIsOpen) return;

    function onBlur() {
      pipDebug("blur — trying to open on leftover activation");
      void openPip({ width: 400, height: 720 }).catch((err) => {
        pipDebug("blur open refused (no activation left)", {
          err: String(err),
        });
      });
    }

    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, [sharing, pipSupported, pipIsOpen, openPip]);

  const present = useWindowPresence();
  const armedRef = useRef(false);

  useEffect(() => {
    pipDebug("presence", { present, pipIsOpen, sharing });

    if (!pipIsOpen) {
      armedRef.current = false;
      autoOpenedRef.current = false;
      return;
    }
    if (!present || autoOpenedRef.current) armedRef.current = true;
    if (present && armedRef.current) {
      pipDebug("closing — host is back");
      closePip();
    }
  }, [pipIsOpen, present, sharing, closePip]);

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
      {/* Sharing the show is the one action that matters in every phase, so it
          sits above the sharing / not-sharing split rather than inside either
          branch — it stays put when the host starts or stops sharing instead of
          disappearing with the stage. z-60 clears the launch screen's z-50. */}
      <div className="fixed right-3 top-3 z-[60] lg:right-4 lg:top-4">
        <ShareShowLinkButton slug={session.slug} compact />
      </div>

      {!sharing ? (
        <HostLaunchScreen
          live
          slug={session.slug}
          title={session.title}
          room={room}
          sharing={sharing}
          onEndShow={handleEndShow}
          pipSupported={pipSupported}
          challengeStore={challengeStore}
        />
      ) : (
        /* Sharing: this tab is the confidence monitor. It shows exactly what
           the audience is watching — the shared window with the host's face
           riding in the corner — rather than a "you're live" holding page. The
           floating window is for when the host is somewhere else entirely. */
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
                viewerPath={viewerPath}
                sharing={sharing}
                onEndShow={handleEndShow}
                pipSupported={pipSupported}
                pipIsOpen={pipIsOpen}
                onPopOut={() => void openFloatingStudio()}
                onClosePopOut={closePip}
              />
            }
            chat={<ChatPanel variant="rail" className="min-h-0 flex-1" />}
          />
        </>
      )}

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

function HostStage({
  viewerPath,
  sharing,
  onEndShow,
  pipSupported,
  pipIsOpen,
  onPopOut,
  onClosePopOut,
}: {
  viewerPath: string;
  sharing: boolean;
  onEndShow: () => void;
  pipSupported: boolean;
  pipIsOpen: boolean;
  onPopOut: () => void;
  onClosePopOut: () => void;
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

      {/* Right padding leaves room for the permanent "Share the show" fixture
          that floats above this bar. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 bg-gradient-to-b from-black/70 via-black/30 to-transparent p-3 pr-36 sm:p-4 sm:pr-40">
        <div className="pointer-events-auto flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-live-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-live-foreground/80" />
            Live
          </span>
          <ViewerCount className="rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-white backdrop-blur-sm [&_span:first-child]:bg-live" />
        </div>

        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {pipSupported ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={pipIsOpen ? onClosePopOut : onPopOut}
                    aria-label={
                      pipIsOpen
                        ? "Close floating controls"
                        : "Pop out floating controls"
                    }
                    className="size-9 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                  >
                    {pipIsOpen ? (
                      <PictureInPicture2 className="size-4" />
                    ) : (
                      <PictureInPicture className="size-4" />
                    )}
                  </Button>
                }
              />
              <TooltipContent>
                {pipIsOpen
                  ? "Floating controls are open — they follow you to the store window"
                  : "Pop out controls so they follow you to the store window"}
              </TooltipContent>
            </Tooltip>
          ) : null}
          <PollLaunchButton onClick={() => setPollComposerOpen(true)} />
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

      <div className={HOST_CONTROL_BAR}>
        <div className={HOST_CONTROL_BAR_INNER}>
          <HostControlBar
            sharing={sharing}
            onEndShow={onEndShow}
            pipSupported={pipSupported}
            variant="stage"
          />
        </div>
      </div>
    </div>
  );
}
