"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Mic, MicOff, MonitorUp, Video, VideoOff } from "lucide-react";

import { EndLiveShowButton } from "@/components/end-live-show-button";
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
import {
  clearShowSetupDraft,
  draftToSetup,
  readShowSetupDraft,
  type ShowSetupDraft,
} from "@/lib/show-setup";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { readResponseJson } from "@/lib/fetch-json";
import { cn } from "@/lib/utils";

import type { ShowSession } from "./host-live-broadcast";
import LiveBroadcast from "./host-live-broadcast";

/** Best-effort end when the host leaves — keepalive survives tab close / nav. */
function endShowOnLeave(slug: string) {
  void fetch(`/api/shows/${slug}/end`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    keepalive: true,
  });
}

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
  const [setupDraft, setSetupDraft] = useState<ShowSetupDraft | null>(null);
  const [setupReady, setSetupReady] = useState(
    () => Boolean(liveShowSlug || resumeSlug),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const liveStartedAt = useRef<number | null>(null);
  // Hold the camera until we know we're staying — no permission prompt on a
  // page we're about to bounce to /host/setup.
  const media = useMediaPreview(setupReady);
  const stopMediaRef = useRef(media.stop);
  // Leave-to-end: track the live slug across nav/tab close without ending on
  // transient LiveKit disconnects (phase → disconnected while still on /host).
  const liveSlugRef = useRef<string | null>(null);
  const intentionallyEndedRef = useRef(false);
  useEffect(() => {
    stopMediaRef.current = media.stop;
  }, [media.stop]);

  // New shows must come through /host/setup. Reconnecting an existing live
  // show (or resuming via ?slug=) skips setup. Draft is cleared when the show
  // ends so a remount after go-live doesn't bounce back to setup.
  const setupCheckedRef = useRef(false);
  useLayoutEffect(() => {
    if (liveShowSlug || resumeSlug) {
      return;
    }
    if (setupCheckedRef.current) return;
    setupCheckedRef.current = true;
    const draft = readShowSetupDraft();
    if (!draft?.intent) {
      router.replace("/host/setup");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSetupDraft(draft);
    if (draft.showName.trim()) setTitle(draft.showName.trim());
    setSetupReady(true);
  }, [liveShowSlug, resumeSlug, router]);

  useEffect(() => {
    const active =
      (phase === "live" || phase === "disconnected") && session?.slug
        ? session.slug
        : null;
    liveSlugRef.current = active;
  }, [phase, session]);

  useEffect(() => {
    function endIfHostLeft() {
      const slug = liveSlugRef.current;
      if (!slug || intentionallyEndedRef.current) return;
      intentionallyEndedRef.current = true;
      liveSlugRef.current = null;
      endShowOnLeave(slug);
    }

    function onPageHide() {
      endIfHostLeft();
    }

    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pagehide", onPageHide);
      // SPA navigate away from /host (browser back, logo, etc.)
      endIfHostLeft();
    };
  }, []);

  useEffect(() => {
    if (phase !== "live" || !session) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase, session]);

  const markShowEnded = useCallback(() => {
    intentionallyEndedRef.current = true;
    liveSlugRef.current = null;
  }, []);

  const resumeShow = useCallback(async (slug: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/shows/${slug}/resume`, { method: "POST" });
      const data = await readResponseJson<{
        error?: string;
        slug: string;
        title: string;
        room: string;
        token: string;
        url: string;
        snapshot: ShowSession["snapshot"];
      }>(res);
      if (!res.ok) throw new Error(data.error ?? "Failed to reconnect");

      stopMediaRef.current();
      if (!liveStartedAt.current) liveStartedAt.current = Date.now();
      intentionallyEndedRef.current = false;
      setSession({
        slug: data.slug,
        title: data.title,
        room: data.room,
        token: data.token,
        url: data.url,
        snapshot: data.snapshot,
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
      const setup = setupDraft ? draftToSetup(setupDraft) : null;
      const res = await fetch("/api/shows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || setupDraft?.showName.trim() || "Untitled show",
          setup: setup ?? undefined,
        }),
      });
      const data = await readResponseJson<{
        error?: string;
        slug: string;
        title: string;
        room: string;
        token: string;
        url: string;
        snapshot?: ShowSession["snapshot"];
      }>(res);
      if (!res.ok) {
        if (res.status === 409 && liveShowSlug) {
          throw new Error(
            "You already have a live show. Reconnect below or end it first.",
          );
        }
        throw new Error(data.error ?? "Failed to start show");
      }

      trackEvent(AnalyticsEvent.HOST_GO_LIVE, { area: "host_studio" });
      stopMediaRef.current();
      liveStartedAt.current = Date.now();
      intentionallyEndedRef.current = false;
      setSession({
        slug: data.slug,
        title: data.title,
        room: data.room,
        token: data.token,
        url: data.url,
        snapshot: data.snapshot,
      });
      setPhase("live");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function handleShowEnded(slug: string) {
    markShowEnded();
    clearShowSetupDraft();
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
        onShowEnded={() => {
          markShowEnded();
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
      setupDraft={setupDraft}
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
  onShowEnded,
}: {
  slug: string;
  title: string;
  loading: boolean;
  error: string | null;
  onReconnect: () => void;
  onShowEnded: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="text-2xl font-normal tracking-tight">Connection lost</h1>
      <p className="text-sm text-muted-foreground">
        Your show <span className="text-foreground">{title}</span> is still live
        for viewers. Reconnect to continue hosting, or leave to end the show.
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
      </div>
    </main>
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

function Preshow({
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
}: {
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
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { cameraOn, micOn, toggleCamera, toggleMic, cameraError } = media;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-12">
      {liveShowSlug ? (
        <div className="flex w-full flex-col gap-3 rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/8">
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

      <div className="flex w-full max-w-lg flex-col items-center gap-4 text-center">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Untitled show"
          aria-label="Show title"
          className="h-auto border-0 bg-transparent px-2 py-1 text-center text-2xl font-medium tracking-tight shadow-none placeholder:text-muted-foreground/50 focus-visible:border-transparent focus-visible:ring-0 sm:text-3xl"
        />

        {setupDraft && !liveShowSlug ? (
          <SetupSummary draft={setupDraft} className="max-w-md" />
        ) : null}

        {liveShowSlug ? (
          <ShareShowLinkButton
            slug={liveShowSlug}
            className="h-11 w-full max-w-md text-base"
            showPath
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Your share link unlocks as soon as you go live.
          </p>
        )}
      </div>

      <div className="relative w-full max-w-xl">
        <VideoFrame className="aspect-video w-full overflow-hidden rounded-2xl">
          <CameraPreview media={media} videoRef={videoRef} />
        </VideoFrame>

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
                    disabled={!media.stream}
                    aria-label={micOn ? "Mute microphone" : "Unmute microphone"}
                    className={cn(
                      "size-10 rounded-full",
                      !micOn && "border-white/30 bg-black/40 text-white hover:bg-black/60",
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
                    disabled={!media.stream}
                    aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
                    className={cn(
                      "size-10 rounded-full",
                      !cameraOn && "border-white/30 bg-black/40 text-white hover:bg-black/60",
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
      </div>

      {cameraError ? (
        <p className="max-w-md border-l-2 border-destructive py-1 pl-3 text-left text-sm text-destructive">
          {cameraError}
        </p>
      ) : null}

      <p className="micro inline-flex items-center gap-1.5 text-muted-foreground">
        <MonitorUp className="size-3.5 shrink-0" />
        After go live, you&apos;ll share a browser window or your screen — that&apos;s
        what viewers see.
      </p>

      {error ? (
        <p className="max-w-md border-l-2 border-destructive py-1 pl-3 text-left text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex w-full max-w-md flex-col items-center gap-3">
        <Button
          onClick={onGoLive}
          disabled={loading || Boolean(liveShowSlug)}
          title={
            liveShowSlug
              ? "End your current live show before starting another"
              : "Creates a shareable show and starts recording automatically"
          }
          className="h-14 w-full rounded-full bg-live text-lg font-medium text-live-foreground hover:bg-live/90 sm:h-16 sm:text-xl"
        >
          {loading ? "Starting…" : "Go live"}
        </Button>
        {liveShowSlug ? (
          <p className="text-sm text-muted-foreground">
            Share the link above so viewers can join before you reconnect.
          </p>
        ) : null}
      </div>
    </main>
  );
}

function useMediaPreview(enabled: boolean): MediaControls {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled) return;
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

    const id = window.requestAnimationFrame(() => {
      void startPreview();
    });

    return () => {
      alive = false;
      window.cancelAnimationFrame(id);
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setStream(null);
      setCameraOn(false);
    };
  }, [enabled]);

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
