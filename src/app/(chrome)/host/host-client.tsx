"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { EndLiveShowButton } from "@/components/end-live-show-button";
import {
  HostLaunchScreen,
  type MediaControls,
} from "@/components/host-launch-screen";
import { Button } from "@/components/ui/button";
import {
  clearShowSetupDraft,
  draftToSetup,
  readShowSetupDraft,
  type ShowSetupDraft,
} from "@/lib/show-setup";
import { AnalyticsEvent, trackEvent } from "@/lib/analytics";
import { readResponseJson } from "@/lib/fetch-json";

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
          // The event the host took on, if they came from a challenge card.
          // The server re-checks it — an unknown or closed slug just yields an
          // ordinary show rather than failing the go-live.
          challengeSlug: setupDraft?.challengeSlug ?? undefined,
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
    <HostLaunchScreen
      live={false}
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
